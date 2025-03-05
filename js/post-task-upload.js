// Setup file upload functionality
function setupFileUpload() {
  const fileDropArea = document.getElementById('file-drop-area');
  const fileInput = document.getElementById('file-input');
  const previewContainer = document.getElementById('file-preview-container');
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_FILES = 5;
  const files = [];
  
  if (!fileDropArea || !fileInput || !previewContainer) return;
  
  // Handle click on drop area to open file picker
  fileDropArea.addEventListener('click', () => fileInput.click());
  
  // Handle file selection via input
  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = ''; // Reset input to allow selecting the same file again
  });
  
  // Prevent default behaviors for drag and drop events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileDropArea.addEventListener(eventName, preventDefaults);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  // Add visual cues for drag events
  ['dragenter', 'dragover'].forEach(eventName => {
    fileDropArea.addEventListener(eventName, () => {
      fileDropArea.classList.add('border-blue-500', 'bg-blue-50');
    });
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    fileDropArea.addEventListener(eventName, () => {
      fileDropArea.classList.remove('border-blue-500', 'bg-blue-50');
    });
  });
  
  // Handle dropped files
  fileDropArea.addEventListener('drop', e => {
    const droppedFiles = e.dataTransfer.files;
    handleFiles(droppedFiles);
  });
  
  // Process selected files
  function handleFiles(fileList) {
    if (files.length >= MAX_FILES) {
      showNotification(`You can upload a maximum of ${MAX_FILES} files.`, 'warning');
      return;
    }
    
    const remainingSlots = MAX_FILES - files.length;
    const filesToProcess = Array.from(fileList).slice(0, remainingSlots);
    
        filesToProcess.forEach(file => {
          // Validate file size
          if (file.size > MAX_FILE_SIZE) {
            showNotification(`File ${file.name} exceeds the 5MB limit.`, 'error');
            return;
          }
          
          // Add to files array
          files.push(file);
          
          // Create preview
          createFilePreview(file);
        });
      }
    }