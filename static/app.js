/**
 * Emergency Support Direct Calling Functions
 * Handles direct tel: and sms: protocol links
 */

// Direct phone calls using tel: protocol
function callEmergencyNumber(phoneNumber) {
  // Format the phone number (remove spaces, dashes, etc.)
  const formattedNumber = phoneNumber.replace(/\s+|-|\(|\)/g, '');
  
  // Use the tel: protocol for direct calling
  window.location.href = `tel:${formattedNumber}`;
  
  // Log the call attempt
  console.log(`Direct call initiated to: ${formattedNumber}`);
  return true;
}

// Direct SMS using sms: protocol  
function sendSMS(phoneNumber, message = '') {
  // Format the phone number
  const formattedNumber = phoneNumber.replace(/\s+|-|\(|\)/g, '');
  
  // Create SMS URL with optional pre-filled message
  let smsUrl = `sms:${formattedNumber}`;
  if (message && message.trim() !== '') {
    // Some devices/browsers use different formats
    // Try using the most compatible format
    smsUrl += `?body=${encodeURIComponent(message)}`;
  }
  
  // Launch SMS app
  window.location.href = smsUrl;
  
  // Log the SMS attempt
  console.log(`SMS initiated to: ${formattedNumber}`);
  return true;
}

// Disable and override any WhatsApp redirections
function overrideWhatsAppRedirects() {
  // Check if any WhatsApp related functions exist and override them
  if (typeof formatPhoneForWhatsApp === 'function') {
    window.formatPhoneForWhatsApp = function(phoneNumber) {
      console.warn('WhatsApp integration is disabled. Using direct call/SMS instead.');
      return phoneNumber.replace(/\s+|-|\(|\)/g, '');
    };
  }
  
  if (typeof showWhatsAppHelp === 'function') {
    window.showWhatsAppHelp = function() {
      console.warn('WhatsApp help is disabled.');
      alert('WhatsApp integration is not available. Direct calling and SMS are used instead.');
      return false;
    };
  }
  
  // Check for and override any openWhatsApp functions
  if (typeof openWhatsApp === 'function') {
    window.openWhatsApp = function(phoneNumber) {
      console.warn('WhatsApp integration is disabled. Using direct call instead.');
      callEmergencyNumber(phoneNumber);
      return false;
    };
  }
}

// Handle emergency service actions
document.addEventListener('DOMContentLoaded', function() {
  // Override any WhatsApp redirections
  overrideWhatsAppRedirects();
  
  // Ensure all emergency call buttons use direct calling
  const emergencyCallLinks = document.querySelectorAll('a[href^="tel:"]');
  emergencyCallLinks.forEach(link => {
    const phoneNumber = link.getAttribute('href').replace('tel:', '');
    link.addEventListener('click', function(event) {
      // Allow the default behavior which is direct calling
      // No need to prevent default since tel: links work directly
      console.log(`Emergency call to ${phoneNumber}`);
    });
  });

  // Ensure all SMS buttons use direct SMS
  const smsLinks = document.querySelectorAll('a[href^="sms:"]');
  smsLinks.forEach(link => {
    const phoneNumber = link.getAttribute('href').replace('sms:', '');
    link.addEventListener('click', function(event) {
      // Allow the default behavior which is direct SMS
      // No need to prevent default since sms: links work directly
      console.log(`SMS to ${phoneNumber}`);
    });
  });
  
  // Fix any links that might be using whatsapp://send or wa.me
  document.querySelectorAll('a[href*="whatsapp"], a[href*="wa.me"]').forEach(link => {
    const originalHref = link.getAttribute('href');
    console.warn(`Converting WhatsApp link to direct call/SMS: ${originalHref}`);
    
    // Extract phone number from WhatsApp URL
    let phoneMatch = originalHref.match(/phone=(\d+)/) || 
                    originalHref.match(/\/(\d+)/) ||
                    originalHref.match(/whatsapp:\/\/send\?phone=(\d+)/);
    
    if (phoneMatch && phoneMatch[1]) {
      const phoneNumber = phoneMatch[1];
      
      // Check if this is a chat or call button
      if (link.textContent.toLowerCase().includes('call') || 
          link.innerHTML.includes('fa-phone')) {
        link.setAttribute('href', `tel:${phoneNumber}`);
        link.addEventListener('click', function(event) {
          event.preventDefault();
          callEmergencyNumber(phoneNumber);
        });
      } else {
        link.setAttribute('href', `sms:${phoneNumber}`);
        link.addEventListener('click', function(event) {
          event.preventDefault();
          sendSMS(phoneNumber);
        });
      }
    }
  });
}); 