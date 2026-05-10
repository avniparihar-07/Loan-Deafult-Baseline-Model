import os
import resend

def send_loan_email(email_type, borrower_name, loan_id, extra=None):
    # Ensure API key is set from environment
    resend.api_key = os.getenv('RESEND_API_KEY')
    
    if extra is None:
        extra = {}
        
    templates = {
        'approved': {
            'subject': f"Your loan has been approved! 🎉",
            'html': f"<h2>Hi {borrower_name},</h2>"
                    f"<p>Your loan <strong>#{loan_id}</strong> has been <span style='color:green'><strong>approved</strong></span>.</p>"
                    f"<p>Our team will contact you shortly.</p>"
        },
        'rejected': {
            'subject': f"Update on your loan application #{loan_id}",
            'html': f"<h2>Hi {borrower_name},</h2>"
                    f"<p>Unfortunately your loan <strong>#{loan_id}</strong> was <span style='color:red'><strong>not approved</strong></span>.</p>"
                    f"<p>Reason: {extra.get('reason', 'Contact support for details.')}</p>"
        },
        'update': {
            'subject': f"Loan update - #{loan_id}",
            'html': f"<h2>Hi {borrower_name},</h2>"
                    f"<p>{extra.get('message', '')}</p>"
                    f"<p>Loan ID: <strong>#{loan_id}</strong></p>"
        }
    }

    template = templates.get(email_type)
    if not template:
        print(f"Unknown email type: {email_type}")
        return None

    try:
        params = {
            "from": "onboarding@resend.dev",
            "to": "thakkerstuti947@gmail.com", # Keeping your test email
            "subject": template['subject'],
            "html": template['html']
        }

        result = resend.Emails.send(params)
        print(f"Email sent successfully: {result}")
        return result
    except Exception as e:
        print(f"Error sending email: {e}")
        return None
