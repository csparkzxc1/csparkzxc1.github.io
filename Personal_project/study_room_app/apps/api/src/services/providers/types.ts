export interface SendResult {
  success: boolean;
  providerMsgId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface AlimtalkRequest {
  phone: string;
  templateId: string;
  message: string;
}

export interface SmsRequest {
  phone: string;
  message: string;
}

export interface AlimtalkProvider {
  sendAlimtalk(req: AlimtalkRequest): Promise<SendResult>;
  sendSms(req: SmsRequest): Promise<SendResult>;
}
