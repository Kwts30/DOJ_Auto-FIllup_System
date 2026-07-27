const Attachment = require('../models/Attachment');
const { UPLOAD_LIMITS } = require('../config/constants');
const { getFilingSchema } = require('../config/filingSchemas');
const { validateFilingInput } = require('../utils/filingValidation');
const { storeFileInGridFS, deleteFileFromGridFS } = require('../utils/fileStorage');
const { validateUploadedFile, isImageMimeType } = require('../utils/uploadValidation');

async function cleanupGridFSFiles(db, gridfsIds) {
  await Promise.all(gridfsIds.map((id) => deleteFileFromGridFS(db, id).catch(() => {})));
}

async function getChargeCodes(db) {
  const charges = await db.collection('charges').find({}, { projection: { code: 1 } }).toArray();
  return charges.map((charge) => charge.code);
}

async function validateDraftInput(db, input, department) {
  const result = validateFilingInput(input, {
    department,
    chargeCodes: await getChargeCodes(db),
    requireComplete: false
  });
  if (!result.valid) throw new Error(result.errors.join('. '));
  return result.schema;
}

async function createAttachments({ db, filing, files, categories, uploadedBy }) {
  if (!files || files.length === 0) return [];

  const schema = getFilingSchema(filing.filing_type);
  if (!schema) throw new Error('Unsupported filing type');

  const currentCount = await Attachment.countByFilingNumber(filing.filing_number);
  if (currentCount + files.length > UPLOAD_LIMITS.maxFilesPerCase) {
    throw new Error(`Maximum ${UPLOAD_LIMITS.maxFilesPerCase} attachments per filing allowed`);
  }

  const mimeTypes = await Promise.all(
    files.map((file) => validateUploadedFile(file, UPLOAD_LIMITS.allowedMimeTypes))
  );
  const created = [];
  const storedGridFSIds = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const category = categories[index];
      const mimeType = mimeTypes[index];
      const isSignature = category === 'officer_signature' || category === 'da_signature';

      if (!schema.requirements.evidence && !isSignature) {
        throw new Error('This filing type does not accept evidence attachments');
      }
      if (isSignature && !isImageMimeType(mimeType)) {
        throw new Error('Signature files must be PNG, JPG, or WEBP images');
      }
      if (isSignature) {
        const existing = await db
          .collection('attachments')
          .findOne({ filing_number: filing.filing_number, category });
        if (existing) throw new Error(`A ${category.replace('_', ' ')} already exists for this filing`);
      }

      // Store to GridFS (memory buffer → MongoDB)
      const gridfsId = await storeFileInGridFS(db, file.buffer, file.originalname, mimeType);
      storedGridFSIds.push(gridfsId);

      const attachment = await Attachment.create({
        category,
        gridfs_id: gridfsId,
        mime_type: mimeType,
        original_name: file.originalname,
        filing_number: filing.filing_number,
        uploaded_by: uploadedBy
      });
      created.push(attachment);
    }
    return created;
  } catch (error) {
    // Rollback: delete GridFS files and DB records
    await cleanupGridFSFiles(db, storedGridFSIds);
    await Promise.all(created.map((attachment) => Attachment.deleteById(attachment._id)));
    throw error;
  }
}

module.exports = {
  cleanupGridFSFiles,
  getChargeCodes,
  validateDraftInput,
  createAttachments
};
