/**
 * WhatsApp Provider Abstraction for "Going Home Right" (HealthNova)
 * Supports SimulatedProvider and CloudApiProvider (Meta WhatsApp Cloud API / Twilio)
 * Selected via WHATSAPP_PROVIDER environment variable.
 */

export interface SendMessageOptions {
  recipientPhone: string;
  messageText: string;
  dischargeId?: string;
  patientName?: string;
  slot?: string;
  medicines?: string[];
  reminderId?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId: string;
  provider: string;
  recipient: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'simulated' | 'failed';
  error?: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  sendMessage(options: SendMessageOptions): Promise<SendMessageResult>;
}

/**
 * 1. SimulatedProvider (Default)
 * Emulates WhatsApp message dispatch for zero-app reminders and testing.
 * Perfect for development, demonstrations, and offline hospital setups.
 * Records messages in memory/database and simulates delivery without third-party fees.
 */
export class SimulatedProvider implements WhatsAppProvider {
  readonly name = 'SimulatedProvider';

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const { recipientPhone, messageText, dischargeId, slot } = options;
    const messageId = `sim_wa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();

    console.log('\n============================================================');
    console.log(`[SimulatedProvider] 🟢 Outgoing WhatsApp Message`);
    console.log(`Recipient: ${recipientPhone} | Ref: ${dischargeId || 'N/A'} | Slot: ${slot || 'general'}`);
    console.log(`Time: ${timestamp}`);
    console.log(`Message Content:\n${messageText}`);
    console.log('============================================================\n');

    return {
      success: true,
      messageId,
      provider: this.name,
      recipient: recipientPhone,
      timestamp,
      status: 'simulated',
    };
  }
}

/**
 * 2. CloudApiProvider
 * Connects to Meta WhatsApp Business Cloud API if credentials exist.
 * Falls back to SimulatedProvider if environment tokens are absent.
 */
export class CloudApiProvider implements WhatsAppProvider {
  readonly name = 'CloudApiProvider';

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const { recipientPhone, messageText, dischargeId, slot } = options;
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Graceful fallback to simulation if credentials are not configured in environment
    if (!token || !phoneNumberId) {
      console.warn(
        `[CloudApiProvider] WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing. Falling back to SimulatedProvider dispatch.`
      );
      const simulated = new SimulatedProvider();
      return simulated.sendMessage(options);
    }

    try {
      const cleanPhone = recipientPhone.replace(/\D/g, '');
      const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[CloudApiProvider] Meta API Error:', data);
        return {
          success: false,
          messageId: `err_${Date.now()}`,
          provider: this.name,
          recipient: recipientPhone,
          timestamp: new Date().toISOString(),
          status: 'failed',
          error: data?.error?.message || 'Failed to dispatch via Meta WhatsApp Cloud API',
        };
      }

      const messageId = data?.messages?.[0]?.id || `wa_meta_${Date.now()}`;
      return {
        success: true,
        messageId,
        provider: this.name,
        recipient: recipientPhone,
        timestamp: new Date().toISOString(),
        status: 'sent',
      };
    } catch (err: any) {
      console.error('[CloudApiProvider] Network exception:', err);
      return {
        success: false,
        messageId: `err_${Date.now()}`,
        provider: this.name,
        recipient: recipientPhone,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: err?.message || 'Network error dispatching WhatsApp message',
      };
    }
  }
}

/**
 * Provider Factory
 * Returns active provider according to WHATSAPP_PROVIDER env (default: simulated)
 */
let providerInstance: WhatsAppProvider | null = null;

export function getWhatsAppProvider(): WhatsAppProvider {
  if (providerInstance) return providerInstance;

  const providerType = (process.env.WHATSAPP_PROVIDER || 'simulated').toLowerCase();

  if (providerType === 'cloud' || providerType === 'meta') {
    providerInstance = new CloudApiProvider();
  } else {
    providerInstance = new SimulatedProvider();
  }

  return providerInstance;
}
