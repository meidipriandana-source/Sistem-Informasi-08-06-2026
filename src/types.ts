/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GDriveItem {
  id: string;
  name: string;
  size: string;
  date: string;
  driveLink: string;
  target?: string;
  category?: 'telaah' | 'sertifikat' | 'perjadin';
  certType?: 'inhouse' | 'outhouse';
  expiryDate?: string;
  issuer?: string;
  year?: string;
}

export interface PerjadinItem extends GDriveItem {
  bulan?: string;
  tujuan?: string;
}

export interface BudgetDetailNode {
  code: string;
  name: string;
  budget: number;
  level: number;
  id?: string;
  children?: BudgetDetailNode[];
}

export interface BludItem {
  id: string;
  kegiatan: string;
  anggaran: number;
  realisasi: number;
  bulan: string;
  date: string;
  pic?: string;
  department?: string;
  lastModified?: string;
}

export interface GoogleConfig {
  driveApiKey: string;
  driveClientId: string;
  driveFolderId: string;
  sheetsApiKey: string;
  sheetsId: string;
  sheetsName: string;
}

export interface RecentActivity {
  id: string;
  text: string;
  time: string;
}

export interface APBDMonthlyInputValues {
  [rowId: string]: {
    [month: string]: number; // value in IDR (Rp)
  };
}

export interface FullBackupPayload {
  app: string;
  version: string;
  timestamp: string;
  telaah: GDriveItem[];
  sertifikat: GDriveItem[];
  perjadin: PerjadinItem[];
  blud: BludItem[];
  apbdInputs: APBDMonthlyInputValues;
  googleConfig: GoogleConfig;
  activities: RecentActivity[];
}
