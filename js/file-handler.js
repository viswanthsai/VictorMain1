/**
 * File Handler
 * Handles file uploads, previews, and validation
 */

class FileHandler {
  /**
   * Initialize file handling on a drop area
   * @param {Object} options - Configuration options
   * @param {string} options.dropAreaId - ID of the drop area element
   * @param {string} options.fileInputId - ID of the file input element
   * @param {string} options.previewContainerId - ID of the preview container element
   * @param {number} options.maxFileSize - Maximum file size in bytes
   * @param {number} options.maxFiles - Maximum number of files
   * @param {Function} options.onFileAdded - Callback when file is added
   * @param {Function} options.onFileRemoved - Callback when file is removed
   * @param {string[]} options.allowedTypes - Array of allowed MIME types
   */
  constructor(options) {
    const defaults = {
      dropAreaId: 'file-drop-area',
      fileInputId: 'file-input',
      previewContainerId: 'file-preview-container',
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
      onFileAdded: null,
      onFileRemoved: null,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    };
    
    this.options = { ...defaults, ...options };
    
    this.files = [];
    
    this.dropArea = document.getElementById(this.options.dropAreaId);
    this.fileInput = document.getElementById(this.options.fileInputId);
    this.previewContainer = document.getElementById(this.options.previewContainerId);
    
    if (!this.dropArea || !this.fileInput || !this.previewContainer) {
      console.error('File handler: Required elements not found');
      return;
    }
    
    this.init();
  }
  
  /**
   * Initialize event listeners
   */
  init() {
    // Click to select files
    this.dropArea.addEventListener('click', () => {
      this.fileInput.click();
    });
    
    // File selection via input
    this.fileInput.addEventListener('change', () => {
      this.handleFiles(this.fileInput.files);
      this.fileInput.value = ''; // Reset input
    });
    
    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropArea.addEventListener(eventName, this.preventDefaults.bind(this));
    });
    
    // Highlight on drag
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropArea.addEventListener(eventName, this.highlight.bind(this));
    });
    
    // Remove highlight
    ['dragleave', 'drop'].forEach(eventName => {
      this.dropArea.addEventListener(eventName, this.unhighlight.bind(this));
    });
    
    // Handle dropped files
    this.dropArea.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      this.handleFiles(files);
    });
  }
  
  /**
   * Prevent default behaviors for drag events
   */
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  /**
   * Add highlight styling to drop area
   */
  highlight() {
    this.dropArea.classList.add('border-blue-500', 'bg-blue-50');
  }
  
  /**
   * Remove highlight styling from drop area
   */
  unhighlight() {
    this.dropArea.classList.remove('border-blue-500', 'bg-blue-50');
  }
  
  /**
   * Process files selected by user
   * @param {FileList} fileList - List of files to process
   */
  handleFiles(fileList) {
    // Check if we've reached the file limit
    if (this.files.length >= this.options.maxFiles) {
      this.showError(`Maximum ${this.options.maxFiles} files allowed.`);
      return;
    }
    
    // Calculate how many more files we can add
    const remainingSlots = this.options.maxFiles - this.files.length;
    
    // Convert FileList to array and limit to remaining slots
    Array.from(fileList).slice(0, remainingSlots).forEach(file => {
      // Check file size
      if (file.size > this.options.maxFileSize) {
        this.showError(`File "${file.name}" exceeds the size limit (${this.formatFileSize(this.options.maxFileSize)}).`);
        return;
      }
      
      // Check file type
      if (this.options.allowedTypes.length && !this.options.allowedTypes.includes(file.type)) {
        this.showError(`File type "${file.type}" is not allowed.`);
        return;
      }
      
      // Add to files array
      this.files.push(file);
      
      // Create preview
      this.createPreview(file);
      
      // Call callback if provided
      if (typeof this.options.onFileAdded === 'function') {
        this.options.onFileAdded(file);
      }
    });
    
    // Show preview container if we have files
    if (this.files.length > 0) {
      this.previewContainer.classList.remove('hidden');
    }
  }
  
  /**
   * Create a preview element for a file
   * @param {File} file - The file to preview
   */
  createPreview(file) {
    const fileId = Date.now() + Math.random().toString(36).substring(2, 10);
    
    const previewElement = document.createElement('div');
    previewElement.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200';
    previewElement.dataset.fileId = fileId;
    
    // Determine icon based on file type
    let fileIcon = 'fa-file';
    if (file.type.startsWith('image/')) fileIcon = 'fa-file-image';
    else if (file.type === 'application/pdf') fileIcon = 'fa-file-pdf';
    else if (file.type.startsWith('text/')) fileIcon = 'fa-file-alt';
    else if (file.type.startsWith('video/')) fileIcon = 'fa-file-video';
    else if (file.type.startsWith('audio/')) fileIcon = 'fa-file-audio';
    
    // Create preview content
    previewElement.innerHTML = `
      <div class="flex items-center">
        <div class="w-10 h-10 bg-gray-200 rounded flex items-center justify-center mr-3">
          <i class="fas ${fileIcon} text-gray-600"></i>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-800">${file.name}</p>
          <p class="text-xs text-gray-500">${this.formatFileSize(file.size)}</p>
        </div>
      </div>
      <button type="button" class="text-gray-400 hover:text-red-500" data-file-id="${fileId}">
        <i class="fas fa-trash-alt"></i>
      </button>
    `;
    
    // Add remove button event listener
    previewElement.querySelector('button').addEventListener('click', () => {
      this.removeFile(fileId, file);
      previewElement.remove();
      
      // Hide container if no files left
      if (this.files.length === 0) {
        this.previewContainer.classList.add('hidden');
      }
    });
    
    // For images, add a preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'w-10 h-10 object-cover rounded';
        
        // Replace icon with thumbnail
        const iconContainer = previewElement.querySelector('.w-10.h-10.bg-gray-200');
        iconContainer.innerHTML = '';
        iconContainer.classList.remove('bg-gray-200');
        iconContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    }
    
    // Add to preview container
    this.previewContainer.appendChild(previewElement);
  }
  
  /**
   * Remove a file from the files array
   * @param {string} fileId - ID of the file to remove
   * @param {File} file - The file object to remove
   */
  removeFile(fileId, file) {
    const index = this.files.indexOf(file);
    if (index !== -1) {
      this.files.splice(index, 1);
      
      // Call callback if provided
      if (typeof this.options.onFileRemoved === 'function') {
        this.options.onFileRemoved(file);
      }
    }
  }
  
  /**
   * Get all selected files
   * @returns {File[]} Array of selected files
   */
  getFiles() {
    return this.files;
  }
  
  /**
   * Clear all selected files
   */
  clearFiles() {
    this.files = [];
    this.previewContainer.innerHTML = '';
    this.previewContainer.classList.add('hidden');
  }
  
  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  showError(message) {
    if (window.notifications && window.notifications.error) {
      window.notifications.error(message);
    } else {
      alert(message);
    }
  }
}

// Make available globally
window.FileHandler = FileHandler;
