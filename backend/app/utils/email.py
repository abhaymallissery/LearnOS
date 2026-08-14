import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Set up logging for our email sender
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - EMAIL SERVER - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

def _send_actual_email(to_email: str, subject: str, body: str):
    smtp_server = os.environ.get("SMTP_SERVER")
    smtp_port = os.environ.get("SMTP_PORT", 587)
    smtp_user = os.environ.get("SMTP_USERNAME")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    
    # Format the From email so it shows as "LearnOS AI" instead of just the email address
    default_from = f"LearnOS AI <{smtp_user}>" if smtp_user else "noreply@learnos.ai"
    from_email = os.environ.get("FROM_EMAIL", default_from)
    
    if not all([smtp_server, smtp_user, smtp_password]):
        logger.warning("SMTP settings incomplete. Falling back to mock email.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(smtp_server, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        logger.info(f"Successfully sent email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

def send_verification_email(to_email: str, token: str):
    """
    Sends a verification email. Uses SMTP if configured, otherwise mocks it.
    Returns True if an actual email was sent, False if it was mocked.
    """
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    verification_link = f"{frontend_url}/verify-email?token={token}"
    
    subject = "Verify your LearnOS AI Account"
    body = f"Welcome to LearnOS AI! Please click the link below to verify your email:\n{verification_link}"

    # Try sending real email first
    if not _send_actual_email(to_email, subject, body):
        # Fallback to mock logging for local dev
        logger.info(f"Mocking verification email to {to_email}")
        print("\n" + "="*50)
        print(f"📧 EMAIL TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print(f"BODY:\n{body}")
        print("="*50 + "\n")
        return False
    return True

def send_password_reset_email(to_email: str, token: str):
    """
    Sends a password reset email. Uses SMTP if configured, otherwise mocks it.
    Returns True if an actual email was sent, False if it was mocked.
    """
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    reset_link = f"{frontend_url}/reset-password?token={token}"
    
    subject = "Password Reset Request"
    body = f"You requested a password reset. Click the link below to verify and activate your new password:\n{reset_link}"

    # Try sending real email first
    if not _send_actual_email(to_email, subject, body):
        # Fallback to mock logging for local dev
        logger.info(f"Mocking password reset email to {to_email}")
        print("\n" + "="*50)
        print(f"📧 EMAIL TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print(f"BODY:\n{body}")
        print("="*50 + "\n")
        return False
    return True

def send_account_not_found_email(to_email: str):
    """
    Sends an email notifying the user that no account exists for this email address,
    and provides a link to register.
    """
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    register_link = f"{frontend_url}/register"
    
    subject = "Password Reset Attempt - Account Not Found"
    body = f"We received a password reset request for this email address, but no account exists.\n\nFirst create a new account in my website and provide website link also:\n[Website Link]/register\n\n(Note: You can use this link for now: {register_link})"

    if not _send_actual_email(to_email, subject, body):
        logger.info(f"Mocking account not found email to {to_email}")
        print("\n" + "="*50)
        print(f"📧 EMAIL TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print(f"BODY:\n{body}")
        print("="*50 + "\n")
        return False
    return True
