/* Client-side logic for Case Filing Form */
document.addEventListener('DOMContentLoaded', () => {
  const MAX_FILE_SIZE = 4.4 * 1024 * 1024; // 4.4 MB limit for Vercel

  const formElement = document.getElementById('filing-form');
  if (!formElement) return;

  const isEdit = formElement.dataset.isEdit === 'true';
  const filingNumber = formElement.dataset.filingNumber || '';
  const hasOfficerSignature = formElement.dataset.hasOfficerSignature === 'true';
  let filingSchemas = {};

  try {
    filingSchemas = JSON.parse(formElement.dataset.filingSchemas || '{}');
  } catch (e) {
    console.error('Failed to parse filing schemas', e);
  }

  const filingTypeSelect = document.getElementById('filing_type');
  const accusedIdGroup = document.getElementById('accused-id-group');
  const chargesSection = document.getElementById('charges-section');
  const narrativeTitle = document.getElementById('narrative-title');
  const narrativeLabel = document.getElementById('narrative-label');
  const narrativeTextarea = document.getElementById('narrative');
  const attachmentsSection = document.getElementById('attachments-section');
  const officerSignatureSection = document.getElementById('officer-signature-section');
  const officerSigFile = document.getElementById('officer-signature-file');

  async function compressImage(file) {
    if (!file.type.startsWith('image/')) return file;
    if (file.type === 'image/gif') return file;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1920;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round(height * (maxDim / width));
              width = maxDim;
            } else {
              width = Math.round(width * (maxDim / height));
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = () => resolve(file);
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }

  function setSectionVisibility(section, visible) {
    if (!section) return;
    section.style.display = visible ? 'block' : 'none';
    section.querySelectorAll('input, select, textarea').forEach((field) => {
      field.disabled = !visible;
    });
  }

  // ── Dynamic Exhibit Slots JS ──
  const exhibitsListContainer = document.getElementById('exhibits-list-container');
  const addExhibitBtn = document.getElementById('add-exhibit-slot-btn');

  if (addExhibitBtn && exhibitsListContainer) {
    addExhibitBtn.addEventListener('click', () => {
      const item = document.createElement('div');
      item.className = 'exhibit-slot-item';
      item.style.display = 'flex';
      item.style.gap = 'var(--space-md)';
      item.style.alignItems = 'center';
      item.style.marginBottom = 'var(--space-sm)';
      item.style.background = 'var(--color-bg-secondary)';
      item.style.padding = 'var(--space-sm)';
      item.style.border = '1px solid var(--color-border)';
      item.style.borderRadius = 'var(--radius-md)';

      let optionsHtml = '';
      const attachmentTypes = [
        { value: 'evidence_photo', label: 'Evidence Photo' },
        { value: 'witness_statement', label: 'Witness Statement' },
        { value: 'body_cam', label: 'Body Camera Footage' },
        { value: 'dash_cam', label: 'Dash Camera Footage' },
        { value: 'surveillance', label: 'Surveillance Footage' },
        { value: 'forensic_report', label: 'Forensic Report' },
        { value: 'medical_report', label: 'Medical Report' },
        { value: 'other', label: 'Other' }
      ];
      attachmentTypes.forEach((t) => {
        optionsHtml += `<option value="${t.value}" ${t.value === 'evidence_photo' ? 'selected' : ''}>${t.label}</option>`;
      });

      item.innerHTML = `
        <div style="flex: 1;">
          <label style="font-size: var(--font-size-xs); color: var(--color-text-secondary); display: block; margin-bottom: 4px;">Exhibit File</label>
          <input type="file" name="files" class="exhibit-file-input form-control" accept="image/*,.pdf,video/*,.txt" style="width: 100%;">
        </div>
        <div style="width: 200px;">
          <label style="font-size: var(--font-size-xs); color: var(--color-text-secondary); display: block; margin-bottom: 4px;">Category</label>
          <select class="exhibit-category-select form-control" style="width: 100%;">
            ${optionsHtml}
          </select>
        </div>
        <button type="button" class="btn btn-icon btn-danger-ghost remove-exhibit-slot" style="margin-top: 20px;" title="Remove Slot">
          <span class="material-icons">close</span>
        </button>
      `;

      exhibitsListContainer.appendChild(item);
      updateRemoveButtonsVisibility();
    });

    exhibitsListContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-exhibit-slot');
      if (btn) {
        btn.closest('.exhibit-slot-item').remove();
        updateRemoveButtonsVisibility();
      }
    });
  }

  function updateRemoveButtonsVisibility() {
    if (!exhibitsListContainer) return;
    const slots = exhibitsListContainer.querySelectorAll('.exhibit-slot-item');
    slots.forEach((slot) => {
      const btn = slot.querySelector('.remove-exhibit-slot');
      if (btn) {
        btn.style.display = slots.length > 1 ? 'block' : 'none';
      }
    });
  }

  function updateFormFields() {
    if (!filingTypeSelect) return;
    const selected = filingTypeSelect.value;
    const schema = filingSchemas[selected];
    if (!schema) return;
    const supportsCharges = schema.ui?.charges;
    const supportsEvidence = schema.ui?.evidence;
    const requiresOfficerSignature = schema.requirements.officerSignature;

    if (selected === 'warrant_request') {
      if (accusedIdGroup) accusedIdGroup.style.display = 'block';
      setSectionVisibility(chargesSection, supportsCharges);
      setSectionVisibility(attachmentsSection, supportsEvidence);
      setSectionVisibility(officerSignatureSection, requiresOfficerSignature);
      if (narrativeTitle) narrativeTitle.innerText = 'Statement of Probable Cause';
      if (narrativeLabel) narrativeLabel.innerHTML = 'Statement of Probable Cause <span class="required">*</span>';
      if (narrativeTextarea) narrativeTextarea.placeholder = 'Describe the probable cause...';
    } else if (selected === 'case_filing') {
      if (accusedIdGroup) accusedIdGroup.style.display = 'none';
      setSectionVisibility(chargesSection, supportsCharges);
      setSectionVisibility(attachmentsSection, supportsEvidence);
      setSectionVisibility(officerSignatureSection, requiresOfficerSignature);
      if (narrativeTitle) narrativeTitle.innerText = 'Affidavit Statement';
      if (narrativeLabel) narrativeLabel.innerHTML = 'Affidavit Statement <span class="required">*</span>';
      if (narrativeTextarea) narrativeTextarea.placeholder = 'Describe the events and facts in detail...';
    }
  }

  if (filingTypeSelect) {
    filingTypeSelect.addEventListener('change', updateFormFields);
    updateFormFields();
  }

  async function getFormData() {
    const formData = new FormData();
    formData.append('accused_name', formElement.querySelector('#accused_name').value);
    formData.append('accused_id_number', formElement.querySelector('#accused_id_number').value);
    formData.append('filing_type', formElement.querySelector('#filing_type').value);
    formData.append('narrative', formElement.querySelector('#narrative').value);

    const selectedCharges =
      chargesSection && chargesSection.style.display !== 'none'
        ? Array.from(formElement.querySelectorAll('input[name="charges"]:checked')).map((cb) => cb.value)
        : [];
    selectedCharges.forEach((charge) => {
      formData.append('charges', charge);
    });

    if (attachmentsSection && attachmentsSection.style.display !== 'none') {
      const fileInputs = formElement.querySelectorAll('.exhibit-file-input');
      for (const input of fileInputs) {
        if (input.files && input.files[0]) {
          let file = input.files[0];
          file = await compressImage(file);
          if (file.size > MAX_FILE_SIZE) throw new Error(`File "${file.name}" exceeds the 4.4MB limit for uploads.`);
          formData.append('files', file);
          const slotItem = input.closest('.exhibit-slot-item');
          const catSelect = slotItem.querySelector('.exhibit-category-select');
          formData.append('categories', catSelect ? catSelect.value : 'evidence_photo');
        }
      }
    }

    if (
      officerSignatureSection &&
      officerSignatureSection.style.display !== 'none' &&
      officerSigFile &&
      officerSigFile.files &&
      officerSigFile.files[0]
    ) {
      let file = officerSigFile.files[0];
      file = await compressImage(file);
      if (file.size > MAX_FILE_SIZE) throw new Error(`Signature image exceeds the 4.4MB limit for uploads.`);
      formData.append('files', file);
      formData.append('categories', 'officer_signature');
    }
    return formData;
  }

  // ── Save Draft ──
  const saveDraftBtn = document.getElementById('save-draft-btn');
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', async () => {
      const originalText = saveDraftBtn.innerHTML;

      if (!formElement.querySelector('#accused_name').value) {
        alert('Accused name is required');
        return;
      }

      if (!formElement.querySelector('#filing_type').value) {
        alert('Filing type is required');
        return;
      }

      saveDraftBtn.disabled = true;
      saveDraftBtn.innerHTML = '<span class="material-icons spin">autorenew</span> Saving...';

      let formData;
      try {
        formData = await getFormData();
      } catch (e) {
        alert(e.message);
        saveDraftBtn.disabled = false;
        saveDraftBtn.innerHTML = originalText;
        return;
      }

      try {
        let res;
        if (isEdit) {
          res = await fetch('/filings/' + filingNumber, {
            method: 'PUT',
            body: formData
          });
        } else {
          res = await fetch('/filings', {
            method: 'POST',
            body: formData
          });
        }

        const result = await res.json();
        if (result.success) {
          window.location.href = result.redirect || '/filings/' + (result.filing_number || filingNumber);
        } else {
          alert(result.error || 'Failed to save filing');
          saveDraftBtn.disabled = false;
          saveDraftBtn.innerHTML = originalText;
        }
      } catch (err) {
        console.error('Save error:', err);
        alert('Failed to save filing');
        saveDraftBtn.disabled = false;
        saveDraftBtn.innerHTML = originalText;
      }
    });
  }

  // ── Submit to DA (e-signature flow) ──
  const submitBtn = document.getElementById('submit-filing-btn');
  const esignModal = document.getElementById('esign-modal');
  const esignClose = document.getElementById('esign-close');
  const esignCancel = document.getElementById('esign-cancel');
  const esignConfirm = document.getElementById('esign-confirm');
  const esignPassword = document.getElementById('esign-password');
  const esignAttest = document.getElementById('esign-attest');

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const schema = filingSchemas[filingTypeSelect.value];
      const requiresOfficerSignature = Boolean(schema?.requirements?.officerSignature);
      if (
        requiresOfficerSignature &&
        !hasOfficerSignature &&
        (!officerSigFile || !officerSigFile.files || officerSigFile.files.length === 0)
      ) {
        alert('Please upload your signature image before submitting');
        return;
      }
      if (esignModal) esignModal.classList.add('show');
    });
  }

  if (esignClose && esignModal) esignClose.addEventListener('click', () => esignModal.classList.remove('show'));
  if (esignCancel && esignModal) esignCancel.addEventListener('click', () => esignModal.classList.remove('show'));

  function checkEsignReady() {
    if (esignConfirm) {
      const schema = filingSchemas[filingTypeSelect.value];
      const signatureReady =
        !schema?.requirements?.officerSignature ||
        hasOfficerSignature ||
        (officerSigFile && officerSigFile.files.length > 0);
      esignConfirm.disabled = !(
        esignPassword &&
        esignPassword.value.length > 0 &&
        esignAttest &&
        esignAttest.checked &&
        signatureReady
      );
    }
  }

  if (esignPassword) esignPassword.addEventListener('input', checkEsignReady);
  if (esignAttest) esignAttest.addEventListener('change', checkEsignReady);
  if (officerSigFile) officerSigFile.addEventListener('change', checkEsignReady);

  if (esignConfirm) {
    esignConfirm.addEventListener('click', async () => {
      const originalText = esignConfirm.innerHTML;
      esignConfirm.disabled = true;
      esignConfirm.innerHTML = '<span class="material-icons spin">autorenew</span> Submitting...';

      try {
        let targetFilingNumber = filingNumber;

        if (!formElement.querySelector('#accused_name').value) {
          alert('Accused name is required before submitting');
          if (esignModal) esignModal.classList.remove('show');
          esignConfirm.disabled = false;
          esignConfirm.innerHTML = originalText;
          return;
        }
        if (!formElement.querySelector('#filing_type').value) {
          alert('Filing type is required before submitting');
          if (esignModal) esignModal.classList.remove('show');
          esignConfirm.disabled = false;
          esignConfirm.innerHTML = originalText;
          return;
        }

        let formData;
        try {
          formData = await getFormData();
        } catch (e) {
          alert(e.message);
          esignConfirm.disabled = false;
          esignConfirm.innerHTML = originalText;
          return;
        }

        const saveUrl = isEdit ? '/filings/' + filingNumber : '/filings';
        const saveMethod = isEdit ? 'PUT' : 'POST';
        const saveRes = await fetch(saveUrl, {
          method: saveMethod,
          body: formData
        });
        const saveResult = await saveRes.json();

        if (!saveResult.success) {
          alert(saveResult.error || 'Failed to save filing draft before submission');
          esignConfirm.disabled = false;
          esignConfirm.innerHTML = originalText;
          return;
        }
        targetFilingNumber = saveResult.filing_number || filingNumber;

        const submitRes = await fetch('/filings/' + targetFilingNumber + '/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attestation_confirmed: true, password: esignPassword.value })
        });
        const submitResult = await submitRes.json();

        if (submitResult.success) {
          window.location.href = '/filings/' + targetFilingNumber;
        } else {
          alert(submitResult.error || 'Failed to submit filing');
          esignConfirm.disabled = false;
          esignConfirm.innerHTML = originalText;
        }
      } catch (err) {
        console.error('Submit error:', err);
        alert('Failed to submit filing');
        esignConfirm.disabled = false;
        esignConfirm.innerHTML = originalText;
      }
    });
  }

  // ── Attachment Upload ──
  const uploadBtn = document.getElementById('upload-btn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      const fileInputs = document.querySelectorAll('.exhibit-file-input');
      const formData = new FormData();
      let hasFiles = false;

      for (const input of fileInputs) {
        if (input.files && input.files[0]) {
          let file = input.files[0];
          file = await compressImage(file);
          if (file.size > MAX_FILE_SIZE) {
            alert(`File "${file.name}" exceeds the 4.4MB limit for uploads.`);
            return;
          }
          formData.append('files', file);
          const slotItem = input.closest('.exhibit-slot-item');
          const catSelect = slotItem.querySelector('.exhibit-category-select');
          formData.append('categories', catSelect ? catSelect.value : 'evidence_photo');
          hasFiles = true;
        }
      }

      if (!hasFiles) {
        alert('Select at least one file to upload');
        return;
      }

      try {
        const res = await fetch('/filings/' + filingNumber + '/attachments', {
          method: 'POST',
          body: formData
        });
        const result = await res.json();
        if (result.success) {
          location.reload();
        } else {
          alert(result.error || 'Upload failed');
        }
      } catch (err) {
        console.error('Upload error:', err);
        alert('Upload failed');
      }
    });
  }

  // ── Delete Attachment ──
  document.querySelectorAll('.delete-attachment').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this attachment?')) return;
      const filingNum = btn.dataset.filing;
      const attId = btn.dataset.id;

      try {
        const res = await fetch('/filings/' + filingNum + '/attachments/' + attId, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
          btn.closest('.attachment-item').remove();
        } else {
          alert(result.error || 'Failed to remove');
        }
      } catch (err) {
        alert('Failed to remove attachment');
      }
    });
  });
});
