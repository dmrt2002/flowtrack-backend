# Gmail SMTP Setup Guide

This guide will help you configure Gmail SMTP to send emails locally for testing.

## Prerequisites

1. A Gmail account
2. 2-Step Verification enabled on your Gmail account

## Step 1: Enable 2-Step Verification

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **2-Step Verification**
3. Follow the prompts to enable it (you'll need your phone)

## Step 2: Generate an App Password

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Or navigate: Google Account → Security → 2-Step Verification → App passwords
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter a name like "FlowTrack Local Dev"
5. Click **Generate**
6. **Copy the 16-character password** (you won't see it again!)
   - Format: `xxxx xxxx xxxx xxxx` (remove spaces when using)

## Step 3: Update Your .env File

Add or update these variables in your `backend/.env` file:

```bash
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=iinitiald958@gmail.com
SMTP_PASS=ndlv hcde ljis itdg
SMTP_FROM_EMAIL=iinitiald958@gmail.com
SMTP_FROM_NAME=FlowTrack
```

### Example:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=john.doe@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM_EMAIL=john.doe@gmail.com
SMTP_FROM_NAME=FlowTrack
```

**Important Notes:**
- Use port **587** (STARTTLS) - this is the recommended port
- Use your **full Gmail address** for `SMTP_USER`
- Use the **16-character App Password** (not your regular Gmail password)
- Remove spaces from the app password if it has them

## Step 4: Restart Your Backend Server

After updating the `.env` file, restart your backend server:

```bash
cd backend
npm run start:dev
```

You should see a log message like:
```
📧 Email service initialized with SMTP: smtp.gmail.com:587 (STARTTLS)
```

## Step 5: Test Email Sending

You can test by:
1. Registering a new user (will send verification email)
2. Using "Forgot Password" feature
3. Triggering workflow emails

## Troubleshooting

### Error: "Invalid login"
- Make sure you're using the **App Password**, not your regular Gmail password
- Verify 2-Step Verification is enabled
- Check that the password has no spaces

### Error: "Connection timeout"
- Check your firewall/network settings
- Try port **465** with SSL (change `SMTP_PORT=465` and the code will auto-detect SSL)

### Error: "Less secure app access"
- Gmail no longer supports "Less secure apps"
- You **must** use App Passwords with 2-Step Verification enabled

### Alternative: Port 465 (SSL)
If port 587 doesn't work, you can use port 465 with SSL:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

The code automatically detects port 465 and uses SSL.

## Security Notes

⚠️ **Never commit your `.env` file to git!**
- App Passwords are sensitive credentials
- Keep them secure and rotate them periodically
- Use different app passwords for different environments (dev, staging, prod)

## Switching Back to Mailtrap

If you want to switch back to Mailtrap for testing:

```bash
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-password
```

