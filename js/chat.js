document.addEventListener('DOMContentLoaded', function() {
    const chatIcon = document.querySelector('.chat-icon');
    
    if (chatIcon) {
        chatIcon.addEventListener('click', function() {
            // Replace with your chat functionality
            alert('Chat feature will open here!');
            // You can redirect to a chat page or open a chat modal
            // window.location.href = 'chat.html';
            // or
            // openChatModal();
        });
    }
});

function openChatModal() {
    // Your code to open a chat modal
    console.log('Opening chat modal');
}
