export interface Asset {
  code: string;
  issuer?: string;
  name: string;
  type: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
}

export interface Order {
  id: string;
  price: number;
  amount: number;
  total: number;
  type: 'buy' | 'sell';
  maker: string;
  timestamp: string;
}

export interface Trade {
  id: string;
  price: number;
  amount: number;
  total: number;
  type: 'buy' | 'sell';
  timestamp: string;
}

export const SUPPORTED_ASSETS: Asset[] = [
  { code: 'XLM', name: 'Stellar Lumens', type: 'native' },
  { code: 'DUST', name: 'Stardust', type: 'credit_alphanum4', issuer: 'GDUST...' },
  { code: 'CRYS', name: 'Nebula Crystal', type: 'credit_alphanum4', issuer: 'GCRYS...' },
  { code: 'DARK', name: 'Dark Matter', type: 'credit_alphanum4', issuer: 'GDARK...' },
];
