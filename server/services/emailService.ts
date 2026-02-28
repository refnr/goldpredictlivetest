import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
}

function getTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const transporter = getTransporter();

    if (!transporter) {
      console.log(`Email skipped (SMTP not configured): To: ${options.to}, Subject: ${options.subject}`);
      return true;
    }

    await transporter.sendMail({
      from: `"Gold Predict" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.htmlContent,
    });

    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(userEmail: string, userName?: string, nickname?: string): Promise<boolean> {
  const displayName = nickname || userName || userEmail.split('@')[0];
  const appUrl = process.env.APP_URL || 'https://goldpredict.replit.app';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Gold Predict</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f; color: #e5e5e5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #141419; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a35;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #1a1a22 0%, #0f0f14 100%);">
              <div style="display: inline-flex; align-items: center; gap: 12px;">
                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #D4AF37 0%, #F4C430 50%, #B8860B 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 24px; color: #000;">AU</span>
                </div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #D4AF37 0%, #F4C430 50%, #B8860B 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Gold Predict</h1>
              </div>
            </td>
          </tr>
          
          <!-- Welcome Message -->
          <tr>
            <td style="padding: 30px 40px;">
              <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #D4AF37;">Welcome to Gold Predict, ${displayName}!</h2>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #b0b0b0;">
                Congratulations on joining the premier XAUUSD market analysis platform! You now have access to powerful tools designed to help you make informed trading decisions in the gold market.
              </p>
            </td>
          </tr>
          
          <!-- Getting Started Guide -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h3 style="margin: 0 0 20px 0; font-size: 20px; color: #ffffff; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">Getting Started Guide</h3>
              
              <!-- Step 1 -->
              <div style="margin-bottom: 25px; padding: 20px; background-color: #1a1a22; border-radius: 8px; border-left: 4px solid #D4AF37;">
                <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #D4AF37;">1. Dashboard Overview</h4>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #b0b0b0;">
                  Your dashboard displays real-time XAU/USD price data, including the current price, 24-hour change, and market status. The price chart shows historical data with interactive zoom controls for different timeframes (1m, 5m, 15m, 30m, 1H, 4H, 1D, 1W, 1M).
                </p>
              </div>
              
              <!-- Step 2 - All 10 Technical Indicators -->
              <div style="margin-bottom: 25px; padding: 20px; background-color: #1a1a22; border-radius: 8px; border-left: 4px solid #D4AF37;">
                <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #D4AF37;">2. Technical Indicators (10 Available)</h4>
                <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; color: #b0b0b0;">
                  Access powerful technical analysis tools based on your subscription plan:
                </p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #b0b0b0; font-size: 13px; line-height: 1.9;">
                  <li><strong style="color: #ffffff;">RSI (Relative Strength Index)</strong> - Identifies overbought/oversold conditions (0-100 scale)</li>
                  <li><strong style="color: #ffffff;">MACD (Moving Average Convergence Divergence)</strong> - Shows momentum and trend direction</li>
                  <li><strong style="color: #ffffff;">SMA (Simple Moving Average)</strong> - Reveals price trends over time</li>
                  <li><strong style="color: #ffffff;">EMA (Exponential Moving Average)</strong> - More responsive to recent price changes</li>
                  <li><strong style="color: #ffffff;">Bollinger Bands</strong> - Measures volatility and potential breakouts</li>
                  <li><strong style="color: #ffffff;">Stochastic Oscillator</strong> - Compares closing price to price range</li>
                  <li><strong style="color: #ffffff;">Williams %R</strong> - Identifies momentum and reversal points</li>
                  <li><strong style="color: #ffffff;">CCI (Commodity Channel Index)</strong> - Measures price deviation from average</li>
                  <li><strong style="color: #ffffff;">Pivot Points</strong> - Key support and resistance levels</li>
                  <li><strong style="color: #ffffff;">AI Prediction</strong> - Machine learning-based price forecasts</li>
                </ul>
              </div>
              
              <!-- Step 3 -->
              <div style="margin-bottom: 25px; padding: 20px; background-color: #1a1a22; border-radius: 8px; border-left: 4px solid #D4AF37;">
                <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #D4AF37;">3. AI-Powered Predictions</h4>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #b0b0b0;">
                  Our advanced prediction system uses statistical models to forecast price movements. Navigate to the <strong style="color: #ffffff;">Predictions</strong> page to generate forecasts for different timeframes and view prediction confidence levels. Daily prediction limits vary by plan (Basic: 3/day, Pro: 10/day, Premium: Unlimited).
                </p>
              </div>
              
              <!-- Step 4 -->
              <div style="margin-bottom: 25px; padding: 20px; background-color: #1a1a22; border-radius: 8px; border-left: 4px solid #D4AF37;">
                <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #D4AF37;">4. Trading Signals</h4>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #b0b0b0;">
                  The <strong style="color: #ffffff;">Signals</strong> page provides actionable trading signals with entry prices, target levels, and stop-loss recommendations. Each signal includes confidence ratings and relevant market analysis. Available for Pro and Premium plans.
                </p>
              </div>
              
              <!-- Step 5 -->
              <div style="margin-bottom: 25px; padding: 20px; background-color: #1a1a22; border-radius: 8px; border-left: 4px solid #D4AF37;">
                <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #D4AF37;">5. AI Market Analysis</h4>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #b0b0b0;">
                  Access AI-generated market insights via the notification bell icon. Our AI analyzes current market conditions, provides trading suggestions, and identifies key market trends in real-time. Premium AI reports available for Premium subscribers.
                </p>
              </div>
              
              <!-- Step 6 - Subscription Plans -->
              <div style="margin-bottom: 25px; padding: 20px; background-color: #1a1a22; border-radius: 8px; border-left: 4px solid #D4AF37;">
                <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #D4AF37;">6. Subscription Plans</h4>
                <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; color: #b0b0b0;">
                  Choose the plan that fits your trading needs:
                </p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #b0b0b0; font-size: 13px; line-height: 1.9;">
                  <li><strong style="color: #D4AF37;">Basic ($9.99/mo)</strong> - RSI indicator, 3 predictions/day</li>
                  <li><strong style="color: #D4AF37;">Pro ($19.99/mo)</strong> - RSI/MACD/SMA, 10 predictions/day, trading signals, weekly alerts</li>
                  <li><strong style="color: #D4AF37;">Premium ($49.99/mo)</strong> - All 10 indicators, unlimited predictions, priority signals, AI reports, real-time alerts</li>
                </ul>
              </div>
              
              <!-- Step 7 - Profile -->
              <div style="margin-bottom: 25px; padding: 20px; background-color: #1a1a22; border-radius: 8px; border-left: 4px solid #D4AF37;">
                <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #D4AF37;">7. Personalize Your Profile</h4>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #b0b0b0;">
                  Click your profile icon in the top-right corner to set a custom nickname. This nickname will be displayed throughout the app and used in email communications. You can also manage your subscription and billing from the Settings page.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Pro Tips Section -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h3 style="margin: 0 0 20px 0; font-size: 20px; color: #ffffff; border-bottom: 2px solid #22c55e; padding-bottom: 10px;">Pro Tips for Success</h3>
              
              <div style="padding: 20px; background: linear-gradient(135deg, #0f2b1a 0%, #0a1f12 100%); border-radius: 8px; border: 1px solid #22c55e33;">
                <ul style="margin: 0; padding-left: 20px; color: #b0b0b0; font-size: 14px; line-height: 2;">
                  <li><strong style="color: #22c55e;">Always use stop-loss orders</strong> - Protect your capital by setting clear exit points</li>
                  <li><strong style="color: #22c55e;">Combine multiple indicators</strong> - Use RSI with MACD and Bollinger Bands for stronger confirmation signals</li>
                  <li><strong style="color: #22c55e;">Check market status</strong> - Gold markets have specific trading hours; be aware of session times</li>
                  <li><strong style="color: #22c55e;">Start with longer timeframes</strong> - 4H and 1D charts provide clearer trend signals</li>
                  <li><strong style="color: #22c55e;">Review AI predictions</strong> - Our AI updates analysis in real-time; check notifications regularly</li>
                  <li><strong style="color: #22c55e;">Use dark/light mode</strong> - Toggle theme in the header for comfortable viewing</li>
                  <li><strong style="color: #22c55e;">Monitor Pivot Points</strong> - Key levels for entry/exit decisions</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Important Notice -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <div style="padding: 20px; background: linear-gradient(135deg, #2b1f0f 0%, #1f170a 100%); border-radius: 8px; border: 1px solid #D4AF3733;">
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #b0b0b0;">
                  <strong style="color: #D4AF37;">Important:</strong> Gold Predict provides market analysis and predictions for educational and informational purposes only. This is not financial advice. Always conduct your own research and consider consulting a financial advisor before making trading decisions. Past performance does not guarantee future results.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${appUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: #000000; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                Open Gold Predict Dashboard
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #0a0a0f; text-align: center; border-top: 1px solid #2a2a35;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                Thank you for choosing Gold Predict
              </p>
              <p style="margin: 0; font-size: 12px; color: #444444;">
                2026 Gold Predict. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  
  return sendEmail({
    to: userEmail,
    subject: 'Welcome to Gold Predict - Your Complete Getting Started Guide',
    htmlContent: htmlContent
  });
}
