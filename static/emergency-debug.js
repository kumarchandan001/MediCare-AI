// Emergency Support Page Debug Script
document.addEventListener('DOMContentLoaded', function() {
  console.log('Emergency debug script loaded');
  
  // Initialize emoji grid if not already done
  const initializeEmojiGrid = function() {
    console.log('Initializing emoji grid...');
    const emojiContainer = document.querySelector('.emoji-picker-container');
    if (!emojiContainer) {
      console.error('Emoji container not found');
      return;
    }
    
    if (emojiContainer.querySelector('.emoji-grid')) {
      console.log('Emoji grid already initialized');
      return;
    }
    
    // Common emojis to display
    const commonEmojis = ['😊','👍','❤️','😂','🙏','😍','🤔','👏','😎','👌','😁','👋',
                       '🥰','😇','🙌','💪','👩‍⚕️','🏥','💊','💉','🌡️','🔬','🩺','🧠'];
    
    const emojiGrid = document.createElement('div');
    emojiGrid.className = 'emoji-grid';
    
    commonEmojis.forEach(emoji => {
      const emojiBtn = document.createElement('button');
      emojiBtn.className = 'emoji-btn';
      emojiBtn.textContent = emoji;
      
      emojiBtn.addEventListener('click', function() {
        const chatInput = document.querySelector('.message-input');
        if (chatInput) {
          // Insert emoji at cursor position
          const cursorPos = chatInput.selectionStart;
          const textBefore = chatInput.value.substring(0, cursorPos);
          const textAfter = chatInput.value.substring(cursorPos);
          chatInput.value = textBefore + emoji + textAfter;
          
          // Move cursor after the inserted emoji
          chatInput.selectionStart = cursorPos + emoji.length;
          chatInput.selectionEnd = cursorPos + emoji.length;
          chatInput.focus();
          
          // Close emoji picker
          document.body.classList.remove('show-emoji-picker');
        }
      });
      
      emojiGrid.appendChild(emojiBtn);
    });
    
    // Clear placeholder and add the emoji grid
    emojiContainer.innerHTML = '';
    emojiContainer.appendChild(emojiGrid);
  };
  
  // Wait a moment for all other scripts to load, then run our fixes
  setTimeout(function() {
    console.log('Running emergency page fixes');
    
    // Initialize the emoji grid
    initializeEmojiGrid();
    
    console.log('All fixes applied');
  }, 500);
}); 