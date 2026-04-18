export interface SendResult {
  success: boolean;
  providerMsgId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface AlimtalkButton {
  name: string;
  type: "WL";
  urlMobile: string;
  urlPc: string;
}

export interface AlimtalkRequest {
  phone: string;
  templateId: string;
  message: string;
  buttons?: AlimtalkButton[];
}

export interface SmsRequest {
  phone: string;
  message: string;
}

export interface AlimtalkProvider {
  sendAlimtalk(req: AlimtalkRequest): Promise<SendResult>;
  sendSms(req: SmsRequest): Promise<SendResult>;
}
