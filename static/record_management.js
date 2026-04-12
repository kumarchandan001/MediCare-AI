document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const recordForm = document.getElementById('recordForm');
  const recordNameInput = document.getElementById('record-name');
  const recordCategorySelect = document.getElementById('record-category');
  const recordDateInput = document.getElementById('record-date');
  const recordFileInput = document.getElementById('record-file');
  const recordNotesInput = document.getElementById('record-notes');
  const dropArea = document.getElementById('drop-area');
  const selectedFileDiv = document.getElementById('selected-file');
  const fileNameDiv = document.querySelector('.selected-file-name');
  const fileSizeDiv = document.querySelector('.selected-file-size');
  const removeFileBtn = document.getElementById('remove-file');
  const uploadBtn = document.getElementById('upload-btn');
  const recordsList = document.getElementById('records-list');
  const emptyRecordsDiv = document.getElementById('empty-records');
  const recordsCountSpan = document.getElementById('records-count');
  const searchInput = document.getElementById('search-records');
  const filterCategorySelect = document.getElementById('filter-category');
  const filterDateSelect = document.getElementById('filter-date');
  const recordModal = document.getElementById('record-modal');
  const modalTitle = document.getElementById('modal-title');
  const previewContainer = document.getElementById('preview-container');
  const modalCloseBtn = document.getElementById('modal-close');
  const modalCancelBtn = document.getElementById('modal-cancel');
  const modalDownloadBtn = document.getElementById('modal-download');
  const browseBtn = document.getElementById('browse-btn');

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  if (recordDateInput) {
    recordDateInput.value = today;
  }

  // Initialize records from localStorage
  let records = JSON.parse(localStorage.getItem('medicalRecords')) || [];
  console.log('Loaded records from localStorage:', records.length);
  
  // Initialize UI
  updateRecordsList();
  updateRecordsCount();

  // 1. BROWSE BUTTON FUNCTIONALITY
  if (browseBtn && recordFileInput) {
    browseBtn.addEventListener('click', function() {
      recordFileInput.click();
    });
  }

  // 2. DRAG AND DROP FUNCTIONALITY
  if (dropArea) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
      dropArea.classList.add('highlight');
    }

    function unhighlight() {
      dropArea.classList.remove('highlight');
    }

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      
      if (files.length > 0) {
        recordFileInput.files = files; // Update the input's files
        handleFiles(files[0]);
      }
    }
  }

  // 3. FILE SELECTION HANDLING
  if (recordFileInput) {
    recordFileInput.addEventListener('change', function() {
      if (this.files.length > 0) {
        handleFiles(this.files[0]);
      }
    });
  }

  function handleFiles(file) {
    displayFileInfo(file);
  }

  function displayFileInfo(file) {
    if (selectedFileDiv && fileNameDiv && fileSizeDiv) {
      selectedFileDiv.style.display = 'flex';
      fileNameDiv.textContent = file.name;
      fileSizeDiv.textContent = formatFileSize(file.size);
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // 4. REMOVE SELECTED FILE
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', function() {
      selectedFileDiv.style.display = 'none';
      recordFileInput.value = '';
    });
  }

  // 5. FORM SUBMISSION
  if (recordForm) {
    recordForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      if (!recordFileInput.files || recordFileInput.files.length === 0) {
        alert('Please select a file to upload');
        return;
      }
      
      const file = recordFileInput.files[0];
      
      // Read file content as data URL
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const dataURL = e.target.result;
          
          // Create record object
          const newRecord = {
            id: Date.now().toString(),
            name: recordNameInput.value,
            category: recordCategorySelect.value,
            date: recordDateInput.value,
            notes: recordNotesInput.value || '',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            dataURL: dataURL,
            uploadedAt: new Date().toISOString()
          };
          
          // Add to records array and save to localStorage
          records.unshift(newRecord);
          
          try {
            localStorage.setItem('medicalRecords', JSON.stringify(records));
            
            // Reset form
            recordForm.reset();
            recordDateInput.value = today;
            selectedFileDiv.style.display = 'none';
            
            // Update the UI
            updateRecordsList();
            updateRecordsCount();
            
            // Show success message
            alert('Record uploaded successfully!');
          } catch (storageError) {
            console.error('Storage error:', storageError);
            
            // Handle storage quota exceeded
            if (storageError.name === 'QuotaExceededError') {
              alert('Storage limit exceeded. Try uploading a smaller file or removing some existing records.');
              records.shift(); // Remove the record we just tried to add
            } else {
              alert('Error saving record: ' + storageError.message);
            }
          }
        } catch (error) {
          console.error('Error processing file:', error);
          alert('An error occurred while processing your file. Please try again.');
        }
      };
      
      reader.onerror = function() {
        console.error('Error reading file');
        alert('Error reading the file. Please try again.');
      };
      
      reader.readAsDataURL(file);
    });
  }

  // 6. UPDATE RECORDS COUNT
  function updateRecordsCount() {
    if (recordsCountSpan) {
      recordsCountSpan.textContent = records.length;
    }
  }

  // 7. SEARCH FUNCTIONALITY
  if (searchInput) {
    searchInput.addEventListener('input', updateRecordsList);
  }

  // 8. FILTER FUNCTIONALITY
  if (filterCategorySelect) {
    filterCategorySelect.addEventListener('change', updateRecordsList);
  }
  
  if (filterDateSelect) {
    filterDateSelect.addEventListener('change', updateRecordsList);
  }

  // 9. UPDATE RECORDS LIST
  function updateRecordsList() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const categoryFilter = filterCategorySelect ? filterCategorySelect.value : 'all';
    const dateFilter = filterDateSelect ? filterDateSelect.value : 'all';
    
    // Apply filters
    const filteredRecords = records.filter(record => {
      // Search filter
      const matchesSearch = 
        record.name.toLowerCase().includes(searchTerm) || 
        (record.notes && record.notes.toLowerCase().includes(searchTerm)) ||
        record.fileName.toLowerCase().includes(searchTerm);
      
      // Category filter
      const matchesCategory = 
        categoryFilter === 'all' || record.category === categoryFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const recordDate = new Date(record.date);
        const now = new Date();
        
        if (dateFilter === 'recent') {
          // Last 3 months
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          matchesDate = recordDate >= threeMonthsAgo;
        } else if (dateFilter === 'year') {
          // This year
          matchesDate = recordDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === 'older') {
          // Older than this year
          matchesDate = recordDate.getFullYear() < now.getFullYear();
        }
      }
      
      return matchesSearch && matchesCategory && matchesDate;
    });
    
    // Clear current list
    if (recordsList) {
      recordsList.innerHTML = '';
      
      // Show empty state or records
      if (filteredRecords.length === 0) {
        if (emptyRecordsDiv) {
          recordsList.appendChild(emptyRecordsDiv);
          emptyRecordsDiv.style.display = 'block';
        }
      } else {
        if (emptyRecordsDiv) {
          emptyRecordsDiv.style.display = 'none';
        }
        
        // Create record items
        filteredRecords.forEach(record => {
          const recordItem = createRecordItem(record);
          recordsList.appendChild(recordItem);
        });
      }
    }
  }

  // 10. CREATE RECORD ITEM
  function createRecordItem(record) {
    const li = document.createElement('li');
    li.className = 'record-item';
    li.style.backgroundColor = '#ffffff';
    li.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
    
    const iconClass = getCategoryIconClass(record.category);
    const categoryName = getCategoryName(record.category);
    
    li.innerHTML = `
      <div class="record-icon" style="background-color: #ebf8ff;">
        <i class="${iconClass}" style="color: #3182ce;"></i>
      </div>
      <div class="record-details">
        <div class="record-name" style="color: #1a202c; font-size: 16px; font-weight: 600;">
          ${record.name}
          <span class="category-tag category-${record.category}" style="font-weight: 600;">${categoryName}</span>
        </div>
        <div class="record-meta" style="color: #2d3748; font-weight: 500;">
          <span>
            <i class="far fa-calendar" style="color: #4a5568;"></i>
            ${formatDate(record.date)}
          </span>
          <span>
            <i class="far fa-file" style="color: #4a5568;"></i>
            ${formatFileSize(record.fileSize)}
          </span>
        </div>
      </div>
      <div class="record-actions">
        <button class="record-btn view-btn" title="View" aria-label="View ${record.name}" style="background-color: #edf2f7; color: #2d3748;">
          <i class="fas fa-eye"></i>
        </button>
        <button class="record-btn download-btn" title="Download" aria-label="Download ${record.name}" style="background-color: #edf2f7; color: #2d3748;">
          <i class="fas fa-download"></i>
        </button>
        <button class="record-btn delete-btn" title="Delete" aria-label="Delete ${record.name}" style="background-color: #edf2f7; color: #2d3748;">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    // Add event listeners
    const viewBtn = li.querySelector('.view-btn');
    const downloadBtn = li.querySelector('.download-btn');
    const deleteBtn = li.querySelector('.delete-btn');
    
    if (viewBtn) viewBtn.addEventListener('click', () => viewRecord(record));
    if (downloadBtn) downloadBtn.addEventListener('click', () => downloadRecord(record));
    if (deleteBtn) deleteBtn.addEventListener('click', () => deleteRecord(record));
    
    return li;
  }

  // 11. VIEW RECORD
  function viewRecord(record) {
    if (modalTitle && previewContainer && recordModal) {
      modalTitle.textContent = record.name;
      
      // Clear previous content
      previewContainer.innerHTML = '';
      
      // Display appropriate preview based on file type
      if (record.fileType.startsWith('image/')) {
        // Image preview
        const img = document.createElement('img');
        img.src = record.dataURL;
        img.alt = record.name;
        previewContainer.appendChild(img);
      } else if (record.fileType === 'application/pdf') {
        // PDF preview
        previewContainer.innerHTML = `
          <div class="pdf-preview">
            <iframe src="${record.dataURL}" width="100%" height="100%" frameborder="0">
              This browser does not support PDFs. Please download the PDF to view it.
            </iframe>
          </div>
        `;
      } else {
        // Unsupported file type
        previewContainer.innerHTML = `
          <div class="unsupported-file">
            <i class="fas fa-file-alt"></i>
            <p>Preview not available for this file type.</p>
            <p>Please download the file to view its contents.</p>
          </div>
        `;
      }
      
      // Show modal
      recordModal.classList.add('active');
      
      // Set up download button
      modalDownloadBtn.onclick = () => downloadRecord(record);
    }
  }

  // 12. DOWNLOAD RECORD
  function downloadRecord(record) {
    const a = document.createElement('a');
    a.href = record.dataURL;
    a.download = record.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // 13. DELETE RECORD
  function deleteRecord(record) {
    if (confirm(`Are you sure you want to delete "${record.name}"?`)) {
      records = records.filter(r => r.id !== record.id);
      localStorage.setItem('medicalRecords', JSON.stringify(records));
      updateRecordsList();
      updateRecordsCount();
    }
  }

  // 14. CLOSE MODAL
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
  if (recordModal) {
    recordModal.addEventListener('click', function(e) {
      if (e.target === recordModal) {
        closeModal();
      }
    });
  }

  function closeModal() {
    if (recordModal) {
      recordModal.classList.remove('active');
    }
  }

  // 15. HELPER FUNCTIONS
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  function getCategoryIconClass(category) {
    switch (category) {
      case 'lab': return 'fas fa-flask';
      case 'prescription': return 'fas fa-prescription-bottle-alt';
      case 'imaging': return 'fas fa-x-ray';
      case 'vaccination': return 'fas fa-syringe';
      default: return 'fas fa-file-medical';
    }
  }

  function getCategoryName(category) {
    switch (category) {
      case 'lab': return 'Lab Report';
      case 'prescription': return 'Prescription';
      case 'imaging': return 'Imaging';
      case 'vaccination': return 'Vaccination';
      default: return 'Other';
    }
  }
}); 