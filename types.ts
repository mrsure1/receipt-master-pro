
export enum Category {
  Food = '식비',
  Transport = '교통',
  Shopping = '쇼핑/생필품',
  Office = '사무/업무',
  Health = '의료/건강',
  Leisure = '문화/여가',
  Other = '기타'
}

export enum PaymentMethod {
  Card = '카드',
  Cash = '현금',
  Other = '기타'
}

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
  line_total: number;
}

export interface Receipt {
  id: string;
  merchant_name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  total_amount: number;
  tax_amount: number;
  currency: string;
  payment_method: PaymentMethod;
  items: ReceiptItem[];
  category: Category;
  raw_text: string;
  image_uri: string;
  confidence: number;
  memo?: string;
}

export interface GroupedReceipts {
  [key: string]: Receipt[];
}
