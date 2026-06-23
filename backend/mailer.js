// Using built-in Node.js fetch to call the EmailJS REST API
// This completely bypasses Render's SMTP port blocks since it uses standard HTTPS

async function sendOTP(toEmail, otp, name = 'there') {
  // Your EmailJS Configuration
  const serviceId = 'service_5y16j6c';
  const templateId = 'template_h0bc5ef';
  const publicKey = 'sY_fA6G-enj1R2qeL';

  // The data we are sending to the EmailJS API
  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: toEmail,
      name: name,
      otp: otp
    }
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // If EmailJS rejects it (e.g., bad keys, quota limit), throw an error
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EmailJS Error: ${response.status} ${errorText}`);
    }

    console.log(`✅ EmailJS successfully sent OTP to ${toEmail}`);
  } catch (err) {
    console.error('❌ EmailJS sending failed:', err.message);
    throw err; 
  }
}

module.exports = { sendOTP };
