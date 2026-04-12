// Function to display the current time on the top right corner
function updateClock() {
    const clockElement = document.getElementById('clock');
    if (!clockElement) return; // Prevent error if element is missing
  
    function update() {
      const now = new Date();
      clockElement.textContent = now.toLocaleTimeString();
    }
  
    update(); // Run once immediately
    setInterval(update, 1000);
  }
  
  // Function to highlight the active navigation link
  function highlightActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
      // Remove active class from all links
      link.classList.remove('active');
      
      // Compare the link's href with the current path
      const linkPath = new URL(link.href).pathname;
      
      // Add active class if the link matches the current path
      // or if we're on home page and the link is to home
      if (linkPath === currentPath || 
          (currentPath === '/' && linkPath === '/home')) {
        link.classList.add('active');
      }
    });
  }
  
  // Run the clock function
  updateClock();
  
  // Call highlightActiveNavLink when the page loads
  document.addEventListener('DOMContentLoaded', function() {
    // Highlight active navigation link
    highlightActiveNavLink();
    
    // Initialize chatbot
    setupChatbot();
  });
  
  // Also call it now in case DOMContentLoaded already fired
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    highlightActiveNavLink();
    setupChatbot();
  }
  
  // Generic function to handle form submissions with improved error handling
  function handleFormSubmission(buttonSelector, inputs, callback) {
    const button = document.querySelector(buttonSelector);
    if (!button) return;
  
    button.addEventListener('click', function (event) {
      event.preventDefault(); // Prevent default form submission
      const values = inputs.map(selector => {
        const element = document.querySelector(selector);
        return element ? element.value.trim() : '';
      });
      if (values.some(value => value === '')) {
        alert("Please fill out all fields.");
        return;
      }
      try {
        callback(...values);
      } catch (err) {
        console.error("Error handling form submission:", err);
      }
    });
  }
  
  // Emergency Support: Call & Location Sharing
  document.querySelector('#emergency-support button.danger')?.addEventListener('click', function () {
    alert("Calling emergency services...");
  });
  
  document.querySelector('#emergency-support button.warning')?.addEventListener('click', function () {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        alert(`Your location has been shared:\nLatitude: ${latitude}\nLongitude: ${longitude}`);
      },
      () => {
        alert("Unable to retrieve your location.");
      }
    );
  });
  
  // BMI Calculator
  document.querySelector('#bmi-calculator button')?.addEventListener('click', function (event) {
    event.preventDefault();
    const weight = parseFloat(document.getElementById('weight')?.value);
    const heightCm = parseFloat(document.getElementById('height')?.value);
  
    if (!weight || !heightCm) {
      alert("Please enter valid weight and height.");
      return;
    }
  
    const heightMeters = heightCm / 100; // Convert cm to meters
    const bmi = weight / (heightMeters * heightMeters);
    const bmiResult = document.getElementById('bmiResult');
    bmiResult.textContent = `Your BMI is: ${bmi.toFixed(2)}`;
  });
  
  // Health Advice based on condition - updated to be more comprehensive
  document.querySelector('#health-advice button')?.addEventListener('click', function (event) {
    event.preventDefault();
    const condition = document.getElementById('health-condition')?.value.toLowerCase();
    
    if (!condition) {
      alert("Please describe your health condition or select a common symptom.");
      return;
    }
    
    // Extended advice map with more conditions and detailed advice
    const adviceMap = {
      "headache": "For headaches: Stay hydrated, get adequate rest, and consider using over-the-counter pain relievers if needed. Reduce screen time and practice relaxation techniques like deep breathing. If headaches persist or are severe, consult a healthcare provider.",
      "migraine": "For migraines: Rest in a dark, quiet room. Apply cold compresses to your forehead. Consider over-the-counter pain relievers specifically for migraines. Stay hydrated and maintain a regular eating schedule. Identify and avoid your triggers.",
      "fatigue": "For fatigue: Ensure you're getting 7-9 hours of quality sleep, stay hydrated, and maintain a balanced diet rich in iron, B vitamins, and protein. Regular moderate exercise can also boost energy levels. Consider stress management techniques like meditation.",
      "stress": "For stress management: Practice mindfulness or meditation for at least 10 minutes daily. Regular physical activity, adequate sleep, and limiting caffeine and alcohol can help reduce stress levels. Consider time management strategies and setting boundaries.",
      "anxiety": "For anxiety: Practice deep breathing exercises and progressive muscle relaxation. Limit caffeine and alcohol. Regular physical activity can help reduce anxiety symptoms. Consider speaking with a mental health professional for personalized strategies.",
      "insomnia": "For insomnia: Maintain a consistent sleep schedule, create a relaxing bedtime routine, and ensure your bedroom is cool, dark, and quiet. Limit screen time before bed and avoid caffeine in the afternoon and evening. Consider relaxation techniques like progressive muscle relaxation.",
      "back pain": "For back pain: Maintain good posture, especially when sitting for long periods. Regular stretching and strengthening exercises for your core can help. Apply ice for acute pain and heat for chronic pain. Consider over-the-counter pain relievers if needed.",
      "neck pain": "For neck pain: Check your posture, especially during computer use. Take frequent breaks from sitting. Use a supportive pillow when sleeping. Gentle stretching can help relieve tension. Apply heat for chronic pain.",
      "cough": "For cough: Stay hydrated to thin mucus. Use honey and warm liquids for soothing relief (avoid honey for children under 1). Consider over-the-counter cough suppressants for dry coughs or expectorants for productive coughs. Use a humidifier at night.",
      "sore throat": "For sore throat: Gargle with warm salt water several times a day. Stay hydrated with warm liquids. Suck on throat lozenges or ice chips. Use over-the-counter pain relievers if needed. Rest your voice.",
      "fever": "For fever: Stay well hydrated. Take acetaminophen or ibuprofen as directed for temperature over 100.4°F (38°C). Rest and dress lightly. Take lukewarm baths if comfortable. Seek medical attention for very high fevers or fevers lasting more than three days.",
      "common cold": "For common cold: Rest, stay hydrated, and consider over-the-counter medications for symptom relief. Use a humidifier and try warm saltwater gargles for sore throat. Wash hands frequently to prevent spreading illness to others.",
      "allergies": "For allergies: Identify and avoid triggers when possible. Keep windows closed during high pollen seasons and use air purifiers. Consider over-the-counter antihistamines or nasal sprays. For severe allergies, consult an allergist about immunotherapy options.",
      "dehydration": "For dehydration: Drink water regularly throughout the day, aiming for at least 8 glasses. Consume electrolyte-rich foods or beverages for moderate dehydration. Look for signs like dark urine, dry mouth, or dizziness as indicators to increase fluid intake.",
      "nausea": "For nausea: Eat small, frequent meals and avoid greasy or spicy foods. Try ginger tea, peppermint tea, or ginger candies for relief. Stay hydrated with small sips of clear liquids. Get fresh air and avoid strong odors.",
      "bloating": "For bloating: Eat slowly and avoid carbonated drinks. Limit foods that cause gas such as beans, lentils, and certain vegetables. Stay hydrated and consider gentle abdominal massage. Regular physical activity can help with digestion.",
      "constipation": "For constipation: Increase fiber intake gradually through fruits, vegetables, and whole grains. Stay well hydrated. Regular physical activity can help promote bowel movements. Consider a fiber supplement if dietary changes aren't sufficient.",
      "diarrhea": "For diarrhea: Stay hydrated with water, clear broths, and electrolyte solutions. Avoid dairy, fatty, and high-fiber foods temporarily. Try the BRAT diet (bananas, rice, applesauce, toast). Seek medical attention for severe or prolonged diarrhea."
    };
  
    // Look for keywords in the condition description
    let foundAdvice = "Please consult a healthcare professional for personalized advice on your condition.";
    
    for (const key in adviceMap) {
      if (condition.includes(key)) {
        foundAdvice = adviceMap[key];
        break;
      }
    }
    
    // Display the advice with enhanced formatting
    const adviceResult = document.getElementById('adviceResult');
    if (adviceResult) {
      // Remove loading class if it exists and add filled class
      adviceResult.classList.remove('loading');
      adviceResult.classList.add('filled');
      
      // Format the advice with HTML
      adviceResult.innerHTML = `
        <h4>Health Recommendations</h4>
        <p>${foundAdvice}</p>
        <div class="disclaimer">
          <p><small><i class="fas fa-exclamation-circle"></i> This is general advice only. For persistent or severe symptoms, please consult a healthcare professional.</small></p>
        </div>
      `;
    }
  });
  
  // Medical Prescription Generator
  // document.querySelector('#medical-prescription button')?.addEventListener('click', function (event) {
  //   event.preventDefault();
  //   const doctorName = document.getElementById('doctorName')?.value;
  //   const patientName = document.getElementById('patientName')?.value;
  //   const age = document.getElementById('age')?.value;
  //   const medications = document.getElementById('medications')?.value;
  // 
  //   if (!doctorName || !patientName || !age || !medications) {
  //     alert("Please fill in all fields to generate a prescription.");
  //     return;
  //   }
  // 
  //   document.getElementById('doc').textContent = doctorName;
  //   document.getElementById('pat').textContent = patientName;
  //   document.getElementById('patAge').textContent = age;
  //   document.getElementById('med').textContent = medications;
  //   document.getElementById('prescription').style.display = 'block';
  // });
  
  // Disease Prediction
  document.getElementById('symptomForm')?.addEventListener('submit', function (event) {
    event.preventDefault();
  
    // Get user input
    const fever = document.getElementById('fever').value;
    const cough = document.getElementById('cough').value;
    const fatigue = document.getElementById('fatigue').value;
    const shortness_of_breath = document.getElementById('shortness_of_breath').value;
    const headache = document.getElementById('headache').value;
  
    // Send data to the backend
    fetch('/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symptoms: [fever, cough, fatigue, shortness_of_breath, headache],
      }),
    })
      .then(response => response.json())
      .then(data => {
        // Display the result
        document.getElementById('predictionResult').textContent = `Predicted Disease: ${data.predicted_disease || data.error}`;
      })
      .catch(error => {
        console.error('Error:', error);
        document.getElementById('predictionResult').textContent = `Error: ${error.message}`;
      });
  });
  
  // Dynamic Health Tips Section
  const healthTipsList = document.getElementById('healthTips');
  
  if (healthTipsList) { // Check if the element exists
    const addHealthTip = (tip) => {
      const li = document.createElement('li');
      li.textContent = tip;
      healthTipsList.appendChild(li);
    };
  
    // Example predefined tips (could be dynamically loaded)
    [
      'Drink at least 8 glasses of water daily.',
      'Exercise for at least 30 minutes a day.',
      'Eat more fruits and vegetables.',
      'Get at least 7-8 hours of sleep every night.',
      'Too much social media can cause anxiety and stress.',
      'Reduce stress by taking breaks and engaging in hobbies.',
      'Maintain a regular sleep schedule, even on weekends.',
      'Stay connected with family and friends for emotional support.',
      'Avoid smoking, excessive alcohol, and drug use.'
    ].forEach(addHealthTip);
  } else {
    console.error("Element with id 'healthTips' not found!");
  }
  
  // Adjust input field height dynamically
  const messageInput = document.querySelector(".message-input");
  if (messageInput) {
    const initialInputHeight = messageInput.scrollHeight || 47;
    messageInput.addEventListener("input", () => {
      messageInput.style.height = `${initialInputHeight}px`;
      messageInput.style.height = `${messageInput.scrollHeight}px`;
      const chatForm = document.querySelector(".chat-form");
      if (chatForm) {
        chatForm.style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
      }
    });
  
    // Handle Enter key press for sending messages on larger screens
    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && e.target.value.trim() && window.innerWidth > 768) {
        const event = new Event('submit', { bubbles: true });
        messageInput.closest('form').dispatchEvent(event);
        e.preventDefault();
      }
    });
  }
  
  // Dashboard Functionality
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize different parts of the UI
    setupDashboard();
    setupHealthMonitoring();
    setupMedicationReminders();
    setupMedicalRecords();
    setupChatbot();
    setupActivityTracking();
    
    // Adjust input field height dynamically
    // ... existing code ...
    
    // Setup Dashboard
    function setupDashboard() {
      const dashboardContainer = document.querySelector('#dashboard-page');
      if (!dashboardContainer) return;
      
      // Fetch health data
      fetch('/api/health-monitoring')
        .then(response => response.json())
        .then(data => {
          if (data.success && data.health_data) {
            updateHealthStatsCard(data.health_data);
          }
        })
        .catch(error => console.error('Error fetching health data:', error));
        
      // Fetch activity data  
      fetch('/api/activity-data')
        .then(response => response.json())
        .then(data => {
          if (data.success && data.activity) {
            updateActivityCard(data.activity);
          }
        })
        .catch(error => console.error('Error fetching activity data:', error));
        
      // Fetch medication reminders
      fetch('/api/medication-reminders')
        .then(response => response.json())
        .then(data => {
          if (data.success && data.reminders) {
            updateMedicationCard(data.reminders);
          }
        })
        .catch(error => console.error('Error fetching medication reminders:', error));
    }
    
    // Update health stats card with latest data
    function updateHealthStatsCard(healthData) {
      // Find the latest entry for each metric
      const latestData = {};
      healthData.forEach(item => {
        if (!latestData[item.metric] || new Date(item.timestamp) > new Date(latestData[item.metric].timestamp)) {
          latestData[item.metric] = item;
        }
      });
      
      // Update heart rate
      const heartRateElement = document.querySelector('#dashboard-page .heart-rate-value');
      if (heartRateElement && latestData.heart_rate) {
        heartRateElement.textContent = `${latestData.heart_rate.value} bpm`;
        updateProgressBar(document.querySelector('#dashboard-page .heart-rate-progress'), latestData.heart_rate.value, 50, 100);
      }
      
      // Update blood pressure
      const bpElement = document.querySelector('#dashboard-page .blood-pressure-value');
      if (bpElement && latestData.blood_pressure) {
        const bpValue = JSON.parse(latestData.blood_pressure.value);
        bpElement.textContent = `${bpValue.systolic}/${bpValue.diastolic}`;
        updateProgressBar(document.querySelector('#dashboard-page .blood-pressure-progress'), bpValue.systolic, 90, 140);
      }
      
      // Update oxygen level
      const oxygenElement = document.querySelector('#dashboard-page .oxygen-value');
      if (oxygenElement && latestData.oxygen) {
        oxygenElement.textContent = `${latestData.oxygen.value}%`;
        updateProgressBar(document.querySelector('#dashboard-page .oxygen-progress'), latestData.oxygen.value, 90, 100);
      }
      
      // Update sleep
      const sleepElement = document.querySelector('#dashboard-page .sleep-value');
      if (sleepElement && latestData.sleep) {
        sleepElement.textContent = `${latestData.sleep.value} hrs`;
        updateProgressBar(document.querySelector('#dashboard-page .sleep-progress'), latestData.sleep.value, 0, 10);
      }
    }
    
    // Update activity card with latest data
    function updateActivityCard(activityData) {
      if (!activityData || activityData.length === 0) return;
      
      // Get latest activity
      const latestActivity = activityData[0];
      
      // Update steps
      const stepsElement = document.querySelector('#dashboard-page .steps-value');
      if (stepsElement && latestActivity.steps) {
        stepsElement.textContent = latestActivity.steps.toLocaleString();
      }
      
      // Update calories
      const caloriesElement = document.querySelector('#dashboard-page .calories-value');
      if (caloriesElement && latestActivity.calories) {
        caloriesElement.textContent = latestActivity.calories;
      }
      
      // Update active minutes
      const activeMinutesElement = document.querySelector('#dashboard-page .active-minutes-value');
      if (activeMinutesElement && latestActivity.active_minutes) {
        activeMinutesElement.textContent = latestActivity.active_minutes;
      }
    }
    
    // Update medication reminders card
    function updateMedicationCard(reminders) {
      if (!reminders || reminders.length === 0) return;
      
      const medicationList = document.querySelector('#dashboard-page .medication-list');
      if (!medicationList) return;
      
      // Clear existing list
      medicationList.innerHTML = '';
      
      // Sort reminders by time
      reminders.sort((a, b) => {
        return new Date('1970/01/01 ' + a.reminder_time) - new Date('1970/01/01 ' + b.reminder_time);
      });
      
      // Add reminders to the list (limit to 3 for the dashboard)
      const remindersToShow = reminders.slice(0, 3);
      remindersToShow.forEach(reminder => {
        const li = document.createElement('li');
        li.className = 'medication-item';
        li.innerHTML = `
          <div class="medication-time">${reminder.reminder_time}</div>
          <div class="medication-details">
            <div class="medication-name">${reminder.medication_name}</div>
            <div class="medication-dosage">${reminder.dosage}</div>
          </div>
          <div class="medication-status">
            <span class="status-icon">✓</span>
          </div>
        `;
        medicationList.appendChild(li);
      });
    }
    
    // Helper function to update progress bars
    function updateProgressBar(progressBar, value, min, max) {
      if (!progressBar) return;
      
      const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
      progressBar.style.width = `${percentage}%`;
      
      // Add color based on percentage
      if (percentage < 30) {
        progressBar.style.backgroundColor = '#ff4d4d'; // Red
      } else if (percentage < 70) {
        progressBar.style.backgroundColor = '#ffcc00'; // Yellow
      } else {
        progressBar.style.backgroundColor = '#4da6ff'; // Blue
      }
    }
  });
  
  // Setup Chatbot
  function setupChatbot() {
    // Make sure we don't set up multiple chatbots
    if (window.chatbotInitialized) {
      console.log('Chatbot already initialized, skipping duplicate setup');
      return;
    }
    
    // Get all chatbot togglers - there should only be one
    const chatTogglers = document.querySelectorAll('#chatbot-toggler, .chatbot-toggler');
    
    // Remove any duplicate chatbot togglers
    if (chatTogglers.length > 1) {
      console.log('Found multiple chatbot togglers, removing duplicates');
      for (let i = 1; i < chatTogglers.length; i++) {
        chatTogglers[i].remove();
      }
    }
    
    // Same for chatbot popups
    const chatPopups = document.querySelectorAll('.chatbot-popup');
    if (chatPopups.length > 1) {
      console.log('Found multiple chatbot popups, removing duplicates');
      for (let i = 1; i < chatPopups.length; i++) {
        chatPopups[i].remove();
      }
    }
    
    const chatToggler = document.getElementById('chatbot-toggler');
    const closeBtn = document.getElementById('close-chatbot');
    const chatForm = document.querySelector('.chat-form');
    const chatInput = document.querySelector('.message-input');
    const chatBody = document.querySelector('.chat-body');
    const emojiPickerBtn = document.getElementById('emoji-picker');
    const fileUploadBtn = document.getElementById('file-upload');
    const fileCancelBtn = document.getElementById('file-cancel');
    const fileInput = document.getElementById('file-input');
    const fileUploadWrapper = document.querySelector('.file-upload-wrapper');
    const filePreview = document.querySelector('.file-upload-wrapper img');
    
    // Backend chatbot API endpoint
    const CHATBOT_API_URL = "/chatbot";
    
    // Maintain conversation history to provide context
    let conversationHistory = [];
    
    // Make sure all elements exist
    if (!chatToggler) {
      console.error('Chatbot toggler not found');
      return;
    }
    
    // Add initial greeting when chatbot is loaded
    if (chatBody && chatBody.querySelectorAll('.bot-message').length === 0) {
      addBotMessage("Hey there! 👋 How can I help you with your health goals today?");
    }
    
    // Pre-initialize emoji picker immediately when chatbot is set up
    initializeEmojiPicker();
    
    // Toggle chatbot visibility when clicking the toggler button
    chatToggler.addEventListener('click', function() {
      document.body.classList.toggle('show-chatbot');
      console.log('Toggled chatbot visibility');
      if (document.body.classList.contains('show-chatbot') && chatInput) {
        chatInput.focus();
      }
    });
    
    // Close chatbot when clicking the close button
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        document.body.classList.remove('show-chatbot');
        console.log('Closed chatbot');
      });
    }
    
    // Handle emoji picker
    if (emojiPickerBtn) {
      emojiPickerBtn.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent any default action
        document.body.classList.toggle('show-emoji-picker');
        console.log('Toggled emoji picker');
      });

      // Also handle touch events for mobile
      emojiPickerBtn.addEventListener('touchend', function(e) {
        e.preventDefault(); // Prevent default touch action
        document.body.classList.toggle('show-emoji-picker');
        console.log('Toggled emoji picker via touch');
      });
      
      // Close emoji picker when clicking outside
      document.addEventListener('click', function(e) {
        if (document.body.classList.contains('show-emoji-picker') && 
            !e.target.closest('.emoji-picker-container') && 
            !e.target.closest('#emoji-picker')) {
          document.body.classList.remove('show-emoji-picker');
        }
      });

      // Also handle touch events for closing
      document.addEventListener('touchend', function(e) {
        if (document.body.classList.contains('show-emoji-picker') && 
            !e.target.closest('.emoji-picker-container') && 
            !e.target.closest('#emoji-picker')) {
          document.body.classList.remove('show-emoji-picker');
        }
      });
    }
    
    // Initialize emoji picker with predefined emojis
    function initializeEmojiPicker() {
      const emojiContainer = document.querySelector('.emoji-picker-container');
      if (!emojiContainer) return;
      
      // Common emojis to display
      const commonEmojis = ['😊','👍','❤️','😂','🙏','😍','🤔','👏','😎','👌','😁','👋',
                           '🥰','😇','🙌','💪','👩‍⚕️','🏥','💊','💉','🌡️','🔬','🩺','🧠'];
      
      const emojiGrid = document.createElement('div');
      emojiGrid.className = 'emoji-grid';
      emojiGrid.style.display = 'grid';
      emojiGrid.style.gridTemplateColumns = 'repeat(6, 1fr)';
      emojiGrid.style.gap = '10px';
      emojiGrid.style.padding = '15px';
      
      commonEmojis.forEach(emoji => {
        const emojiBtn = document.createElement('button');
        emojiBtn.className = 'emoji-btn';
        emojiBtn.textContent = emoji;
        emojiBtn.style.background = 'none';
        emojiBtn.style.border = 'none';
        emojiBtn.style.fontSize = '24px';
        emojiBtn.style.cursor = 'pointer';
        emojiBtn.style.padding = '5px';
        emojiBtn.style.borderRadius = '5px';
        emojiBtn.style.transition = 'all 0.2s ease';
        
        emojiBtn.addEventListener('mouseover', () => {
          emojiBtn.style.background = '#f0f0ff';
          emojiBtn.style.transform = 'scale(1.1)';
        });
        
        emojiBtn.addEventListener('mouseout', () => {
          emojiBtn.style.background = 'none';
          emojiBtn.style.transform = 'scale(1)';
        });
        
        emojiBtn.addEventListener('click', () => {
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
    }
    
    // Handle file upload
    if (fileUploadBtn && fileInput) {
      fileUploadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        fileInput.click();
      });
      
      // Also handle touch events for mobile
      fileUploadBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        fileInput.click();
      });
      
      fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
          // Preview the image
          const reader = new FileReader();
          reader.onload = function(e) {
            if (filePreview) {
              filePreview.src = e.target.result;
              fileUploadWrapper.classList.add('file-uploaded');
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
    
    // Handle file cancel
    if (fileCancelBtn && fileUploadWrapper) {
      fileCancelBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.src = '#';
        fileUploadWrapper.classList.remove('file-uploaded');
      });
      
      // Also handle touch events for mobile
      fileCancelBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.src = '#';
        fileUploadWrapper.classList.remove('file-uploaded');
      });
    }
    
    // Helper function to add bot messages
    function addBotMessage(message) {
      if (!chatBody) return;
      
      const botDiv = document.createElement('div');
      botDiv.className = 'message bot-message';
      botDiv.innerHTML = `
        <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
          <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"/>
        </svg>
        <div class="message-text">${message}</div>
      `;
      chatBody.appendChild(botDiv);
      chatBody.scrollTop = chatBody.scrollHeight;
      return botDiv;
    }
    
    // Helper function to add user messages
    function addUserMessage(message, attachmentSrc = null) {
      if (!chatBody) return;
      
      const userDiv = document.createElement('div');
      userDiv.className = 'message user-message';
      
      let html = `<div class="message-text">${message}</div>`;
      
      // Add attachment if provided
      if (attachmentSrc) {
        html += `<img src="${attachmentSrc}" class="attachment" alt="User uploaded image" />`;
      }
      
      userDiv.innerHTML = html;
      chatBody.appendChild(userDiv);
      chatBody.scrollTop = chatBody.scrollHeight;
      return userDiv;
    }
    
    // Show typing indicator
    function showTypingIndicator() {
      if (!chatBody) return;
      
      const typingDiv = document.createElement('div');
      typingDiv.id = 'typing-indicator';
      typingDiv.className = 'message bot-message thinking';
      typingDiv.innerHTML = `
        <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
          <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"/>
        </svg>
        <div class="message-text">
          <div class="thinking-indicator">
            <div class="dot"></div><div class="dot"></div><div class="dot"></div>
          </div>
        </div>
      `;
      chatBody.appendChild(typingDiv);
      chatBody.scrollTop = chatBody.scrollHeight;
      return typingDiv;
    }
    
    // Remove typing indicator
    function removeTypingIndicator() {
      const indicator = document.getElementById('typing-indicator');
      if (indicator) indicator.remove();
    }
    
    // Call the backend chatbot API to get a response
    async function getChatbotResponse(message) {
      try {
        const response = await fetch(CHATBOT_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
          console.error(`API call failed with status: ${response.status}`);
          return null;
        }
        
        const data = await response.json();
        
        if (data && data.reply) {
          return data.reply;
        } else {
          console.error("Invalid response from API:", data);
          return null;
        }
      } catch (error) {
        console.error("Error calling chatbot API:", error);
        return null;
      }
    }
    
    // Fallback responses when API fails
    const fallbackResponses = {
      "hello": "Hello! How can I help you with your health today?",
      "hi": "Hi there! How can I assist you?",
      "how are you": "I'm doing well, thank you! How can I help you with your health tracking?",
      "help": "I can help you track health metrics, set medication reminders, and provide health advice. What would you like assistance with?",
      "goodbye": "Take care and stay healthy! 💪",
      "thanks": "You're welcome! Feel free to ask me any health questions."
    };
    
    // Health-related responses with variety
    const healthResponses = {
      "heart rate": "💓 Normal resting heart rate for adults: 60-100 bpm. Track yours in Health Monitor!",
      "blood pressure": "🩸 Normal BP: below 120/80 mm Hg. Log yours to track trends over time!",
      "medication": "💊 Set medication reminders to never miss a dose! Check Medication Reminders.",
      "sleep": "😴 Most adults need 7-9 hours daily. Quality sleep is essential!",
      "exercise": "🏃 Aim for 150 minutes of moderate activity weekly. Use Activity Tracking!",
      "diet": "🥗 Include fruits, vegetables, whole grains, lean proteins, and healthy fats.",
      "stress": "🧘 Practice meditation or deep breathing to manage stress effectively.",
      "water": "💧 Drink about 8 glasses of water daily. Stay hydrated!",
      "headache": "🤕 Could be dehydration, stress, or fatigue. Rest and hydrate!",
      "fever": "🌡️ Fever >100.4°F (38°C)? Rest, hydrate, and consider medication.",
      "cold": "🤧 Rest, hydrate with fluids, and use OTC meds for relief.",
      "flu": "🦠 Symptoms: fever, cough, sore throat, body aches. Rest and hydrate!",
      "body pain": "💪 Body pain can result from tension, exercise, or illness. Rest and apply warmth!",
      "body ache": "💪 Body aches often accompany flu or viral infections. Rest and hydrate!",
      "pain": "🩹 Pain location and intensity matter. Rest, ice/heat, and over-the-counter pain relief can help.",
      "ache": "🩹 Muscle aches improve with rest, hydration, and gentle movement.",
      "tired": "😴 Fatigue can indicate dehydration, poor sleep, or illness. Prioritize rest!",
      "fatigue": "😴 Extreme fatigue needs rest, nutrition, and possibly medical evaluation.",
      "cough": "🫁 Cough from cold? Rest, hydrate, and use honey or cough drops.",
      "sore throat": "😷 Sore throats often resolve with rest, fluids, and throat lozenges.",
      "nausea": "🤢 Nausea can indicate various conditions. Stay hydrated with small sips.",
      "dizzy": "🌀 Dizziness may result from dehydration, low blood sugar, or position changes.",
      "dengue": "🦟 Dengue symptoms: high fever, severe headache, joint pain, rash. Seek medical help immediately!",
      "malaria": "🦟 Malaria symptoms: fever, chills, sweating, fatigue. Get tested immediately!",
      "covid": "😷 COVID symptoms: fever, cough, loss of smell/taste, fatigue. Get tested!",
      "diabetes": "🩺 Diabetes: high blood sugar affects the whole body. Regular monitoring is essential.",
      "asthma": "💨 Asthma: breathing difficulty due to airway inflammation. Triggers vary by person.",
      "hypertension": "🩸 High Blood Pressure: called 'silent killer' as it has no symptoms usually.",
      "cholesterol": "❤️ High cholesterol increases heart disease risk. Often no symptoms.",
      "anxiety": "🧠 Anxiety: persistent worry, panic attacks, trembling, difficulty concentrating.",
      "depression": "🧠 Depression: persistent sadness, loss of interest, fatigue, sleep changes.",
      "migraine": "🤕 Migraines: severe headaches with sensitivity to light/sound, sometimes nausea.",
      "arthritis": "🦴 Arthritis: joint inflammation causing pain, stiffness, reduced mobility.",
      "thyroid": "⚡ Thyroid affects metabolism. Issues: hypothyroidism (slow) or hyperthyroidism (fast)."
    };
    
    // Handle chat form submission
    if (chatForm) {
      chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!chatInput) return;
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Check if there's an image attachment
        let attachmentSrc = null;
        if (fileUploadWrapper && fileUploadWrapper.classList.contains('file-uploaded') && filePreview) {
          attachmentSrc = filePreview.src;
        }
        
        // Add user message to chat
        addUserMessage(message, attachmentSrc);
        
        // Clear input and reset file upload
        chatInput.value = '';
        chatInput.style.height = '50px'; // Reset height
        if (fileUploadWrapper) {
          fileUploadWrapper.classList.remove('file-uploaded');
          if (fileInput) fileInput.value = '';
          if (filePreview) filePreview.src = '#';
        }
        
        // Add message to conversation history
        conversationHistory.push({ role: 'user', content: message });
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
          // Get response from backend chatbot API
          const response = await getChatbotResponse(message);
          
          // Remove typing indicator
          removeTypingIndicator();
          
          if (response) {
            // Add API response to chat
            addBotMessage(response);
            conversationHistory.push({ role: 'assistant', content: response });
          } else {
            // API failed, use smart fallback response
            let replied = false;
            const lowerMessage = message.toLowerCase();
            
            // First check for health keywords (more specific)
            for (const [keyword, healthResponse] of Object.entries(healthResponses)) {
              if (lowerMessage.includes(keyword)) {
                addBotMessage(healthResponse);
                conversationHistory.push({ role: 'assistant', content: healthResponse });
                replied = true;
                break;
              }
            }
            
            // Then check for general keywords
            if (!replied) {
              for (const [keyword, fallbackResponse] of Object.entries(fallbackResponses)) {
                if (lowerMessage.includes(keyword)) {
                  addBotMessage(fallbackResponse);
                  conversationHistory.push({ role: 'assistant', content: fallbackResponse });
                  replied = true;
                  break;
                }
              }
            }
            
            // Default helpful response if no keywords matched
            if (!replied) {
              const defaultResponse = "I'm here to help with your health! 🏥 Ask me about:\n• Blood pressure, heart rate, oxygen levels\n• Medications and reminders\n• Sleep, exercise, diet, stress\n• Mental health\n• General health tips\n\nWhat can I help you with?";
              addBotMessage(defaultResponse);
              conversationHistory.push({ role: 'assistant', content: defaultResponse });
            }
          }
        } catch (error) {
          console.error("Error in chat submission:", error);
          removeTypingIndicator();
          addBotMessage("Sorry, I'm having trouble connecting. Please try again in a moment! 😊");
        }
      });
    }
    
    // Also handle clicks on the send button explicitly
    const sendBtn = document.getElementById('send-message');
    if (sendBtn) {
      sendBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!chatForm) return;
        
        // Manually trigger the form submission
        const event = new Event('submit', { bubbles: true, cancelable: true });
        chatForm.dispatchEvent(event);
      });
    }
    
    // Auto-adjust input height based on content
    if (chatInput) {
      const initialInputHeight = 50;
      
      chatInput.addEventListener("input", () => {
        chatInput.style.height = `${initialInputHeight}px`;
        chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`; // Cap at max-height
      });
      
      // Improved Enter key handling to work across all sections
      chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && e.target.value.trim()) {
          e.preventDefault();
          // Find the closest form and trigger submit
          const form = chatInput.closest('form');
          if (form) {
            const event = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(event);
          } else {
            console.error("Could not find a parent form element");
          }
        }
      });
    }
    
    // Mark chatbot as initialized to prevent multiple initializations
    window.chatbotInitialized = true;
  }
  