import crypto from 'crypto';
import WebSocket from 'ws';
import { Readable } from 'stream';

interface VoiceRecognitionResult {
  text: string;
  confidence?: number;
}

export class VoiceService {
  private appId: string;
  private apiKey: string;
  private apiSecret: string;
  private wsUrl: string;

  constructor() {
    this.appId = process.env.XUNFEI_APP_ID || '';
    this.apiKey = process.env.XUNFEI_API_KEY || '';
    this.apiSecret = process.env.XUNFEI_API_SECRET || '';
    this.wsUrl = 'wss://iat-api.xfyun.cn/v2/iat';
  }

  private generateAuthUrl(): string {
    const host = 'iat-api.xfyun.cn';
    const path = '/v2/iat';
    const date = new Date().toUTCString();
    
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    const signatureSha = crypto.createHmac('sha256', this.apiSecret).update(signatureOrigin).digest('base64');
    const authorizationOrigin = `api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');
    
    const url = `wss://${host}${path}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
    return url;
  }

  async recognizeAudio(audioBuffer: Buffer): Promise<VoiceRecognitionResult> {
    return new Promise((resolve, reject) => {
      if (!this.appId || !this.apiKey || !this.apiSecret) {
        reject(new Error('Xunfei credentials not configured'));
        return;
      }

      const url = this.generateAuthUrl();
      const ws = new WebSocket(url);

      let resultText = '';
      let isFinal = false;

      ws.on('open', () => {
        // Send initial parameters
        const params = {
          common: {
            app_id: this.appId
          },
          business: {
            language: 'zh_cn',
            domain: 'iat',
            accent: 'mandarin',
            vinfo: 1,
            vad_eos: 10000
          },
          data: {
            status: 0,
            format: 'audio/L16;rate=16000',
            encoding: 'raw',
            audio: audioBuffer.toString('base64')
          }
        };

        ws.send(JSON.stringify(params));
      });

      ws.on('message', (data: Buffer) => {
        try {
          const result = JSON.parse(data.toString());
          
          if (result.code !== 0) {
            reject(new Error(`Xunfei API error: ${result.message || result.code}`));
            return;
          }

          if (result.data && result.data.result) {
            const wsResult = JSON.parse(result.data.result);
            if (wsResult.ws) {
              wsResult.ws.forEach((item: any) => {
                if (item.cw) {
                  item.cw.forEach((word: any) => {
                    resultText += word.w;
                  });
                }
              });
            }
          }

          if (result.data && result.data.status === 2) {
            isFinal = true;
            ws.close();
            resolve({ text: resultText, confidence: 0.9 });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('error', (error) => {
        reject(error);
      });

      ws.on('close', () => {
        if (!isFinal) {
          resolve({ text: resultText, confidence: 0.8 });
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!isFinal) {
          ws.close();
          resolve({ text: resultText, confidence: 0.7 });
        }
      }, 10000);
    });
  }

  // Alternative: Use browser's Web Speech API on frontend
  // This is a fallback method that returns instructions
  getBrowserSpeechInstructions(): string {
    return 'Please use the browser\'s Web Speech API for voice recognition.';
  }
}

export const voiceService = new VoiceService();

