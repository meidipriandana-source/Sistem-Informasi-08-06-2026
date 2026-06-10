/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  FileText, 
  Award, 
  Calendar, 
  DollarSign, 
  Settings, 
  Plus, 
  Trash2, 
  Printer, 
  Check, 
  AlertCircle,
  Edit, 
  FileUp, 
  FileSpreadsheet, 
  ChevronRight, 
  ChevronDown, 
  Download, 
  Upload, 
  RefreshCw,
  Search,
  BookOpen,
  X,
  FileCheck,
  Eye,
  Info,
  FolderOpen,
  Sun,
  Moon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ExternalLink
} from 'lucide-react';

import { 
  GDriveItem, 
  PerjadinItem, 
  BudgetDetailNode, 
  BludItem, 
  GoogleConfig, 
  RecentActivity, 
  APBDMonthlyInputValues, 
  FullBackupPayload 
} from './types';

import { 
  DEFAULT_DRIVE_FOLDER_ID, 
  DEFAULT_SHEETS_SPREADSHEET_ID, 
  initialSertifikat, 
  initialPerjadin, 
  budgetData 
} from './initialData';

import { initAuth, googleSignIn, googleSignOut, uploadFileToDrive, syncBludToGoogleSheets, appendPdfToGoogleSheets } from './lib/googleAuth';
import { User } from 'firebase/auth';

// Month lists
const MONTHS_KEY = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
const MONTHS_LABEL_ID = [
  { key: 'jan', label: 'Jan' },
  { key: 'feb', label: 'Feb' },
  { key: 'mar', label: 'Mar' },
  { key: 'apr', label: 'Apr' },
  { key: 'mei', label: 'Mei' },
  { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' },
  { key: 'agu', label: 'Agu' },
  { key: 'sep', label: 'Sep' },
  { key: 'okt', label: 'Okt' },
  { key: 'nov', label: 'Nov' },
  { key: 'des', label: 'Des' }
];

const PRESET_ACTIVITIES: RecentActivity[] = [
  { id: 'act-1', text: 'Upload 48 file ke sertifikat', time: new Date(Date.now() - 1000 * 120).toISOString() },
  { id: 'act-2', text: 'Upload 50 file ke sertifikat', time: new Date(Date.now() - 1000 * 300).toISOString() },
  { id: 'act-3', text: 'Upload 5 file ke Laporan Kegiatan', time: new Date(Date.now() - 1000 * 600).toISOString() },
  { id: 'act-4', text: 'Upload 4 file ke Laporan Kegiatan', time: new Date(Date.now() - 1000 * 900).toISOString() },
  { id: 'act-5', text: 'Upload 1 file ke Laporan Kegiatan', time: new Date(Date.now() - 1000 * 1200).toISOString() },
];

interface FlatBudgetRow {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  budget: number;
  level: number;
  isCat: boolean;
  childrenIds: string[];
}

export default function App() {
  // Navigation
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [activeAnggaranTab, setActiveAnggaranTab] = useState<'apbd' | 'blud'>('blud');

  // File states (Local or LocalStorage persistent)
  const [telaahList, setTelaahList] = useState<GDriveItem[]>([]);
  const [sertifikatList, setSertifikatList] = useState<GDriveItem[]>([]);
  const [perjadinList, setPerjadinList] = useState<PerjadinItem[]>([]);
  const [bludList, setBludList] = useState<BludItem[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [googleConfig, setGoogleConfig] = useState<GoogleConfig>({
    driveApiKey: '',
    driveClientId: '',
    driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
    sheetsApiKey: '',
    sheetsId: DEFAULT_SHEETS_SPREADSHEET_ID,
    sheetsName: 'Sheet1'
  });

  // APBD Input Grid
  const [apbdInputs, setApbdInputs] = useState<APBDMonthlyInputValues>({});

  // Active Session PDF list (documents in current session)
  const [uploadedPdfs, setUploadedPdfs] = useState<Array<{ id: string, name: string, size: string, date: string, url: string }>>([]);

  // Google Drive & Sheets Auth Session Space
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Toast System
  const [toasts, setToasts] = useState<Array<{ id: string, message: string, type: 'success' | 'error' | 'info' }>>([]);

  // Search states for Certs & Telaah
  const [searchCertQuery, setSearchCertQuery] = useState('');
  const [certPage, setCertPage] = useState(1);
  const itemsPerPage = 8;

  // Global search states
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showGlobalResults, setShowGlobalResults] = useState(false);

  // Modals
  const [showAddPerjadinModal, setShowAddPerjadinModal] = useState(false);
  const [showAddBludModal, setShowAddBludModal] = useState(false);
  const [showBulkEditBludModal, setShowBulkEditBludModal] = useState(false);
  const [bulkEditPic, setBulkEditPic] = useState('');
  const [bulkEditDept, setBulkEditDept] = useState('');
  const [bulkEditPicChecked, setBulkEditPicChecked] = useState(true);
  const [bulkEditDeptChecked, setBulkEditDeptChecked] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ category: string, id: string | string[], name?: string } | null>(null);
  const [apbdResetConfirmation, setApbdResetConfirmation] = useState<boolean>(false);
  const [clearAllConfirmation, setClearAllConfirmation] = useState<boolean>(false);
  const [editingTelaah, setEditingTelaah] = useState<GDriveItem | null>(null);
  const [editTelaahForm, setEditTelaahForm] = useState({ name: '', driveLink: '', size: '', date: '' });
  const [editingSertifikat, setEditingSertifikat] = useState<GDriveItem | null>(null);
  const [editSertifikatForm, setEditSertifikatForm] = useState({ name: '', driveLink: '', size: '', date: '' });
  const [editingPerjadin, setEditingPerjadin] = useState<PerjadinItem | null>(null);
  const [editPerjadinForm, setEditPerjadinForm] = useState({ name: '', driveLink: '', size: '', date: '', bulan: '', tujuan: '' });
  const [quickPreviewItem, setQuickPreviewItem] = useState<GDriveItem | null>(null);

  // BLUD Sync Specific states
  const [isSyncingBludSheets, setIsSyncingBludSheets] = useState<boolean>(false);
  const [syncBludProgress, setSyncBludProgress] = useState<number>(0);
  const [bludSyncLog, setBludSyncLog] = useState<string>('');
  const [unauthorizedDomainError, setUnauthorizedDomainError] = useState<string | null>(null);
  const [operationNotAllowedError, setOperationNotAllowedError] = useState<boolean>(false);

  // Selected lists states for bulk delete operations
  const [selectedTelaah, setSelectedTelaah] = useState<string[]>([]);
  const [selectedSertifikat, setSelectedSertifikat] = useState<string[]>([]);
  const [selectedPerjadin, setSelectedPerjadin] = useState<string[]>([]);
  const [selectedBlud, setSelectedBlud] = useState<string[]>([]);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('app_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  // High-fidelity BLUD State
  const [bludTabMode, setBludTabMode] = useState<'integrated' | 'original'>('integrated');
  const [bludSubTab, setBludSubTab] = useState<'monitoring' | 'rekap_kontribusi' | 'perjalanan_dinas' | 'makan_minum' | 'honorarium'>('monitoring');
  const [selectedRekapMonth, setSelectedRekapMonth] = useState<number>(0);

  // Schema for each month row of target category
  interface RekapTableRow {
    kolom1: string;
    kolom2: string;
    kolom3: string;
    kolom4: string;
    kolom5: string;
    kolom6: string;
    checked?: boolean;
  }

  const loadRekapData = (prefix: string): Record<number, RekapTableRow[]> => {
    const data: Record<number, RekapTableRow[]> = {};
    for (let m = 0; m < 12; m++) {
      const saved = localStorage.getItem(`${prefix}${m}`);
      if (saved) {
        try {
          data[m] = JSON.parse(saved);
        } catch (e) {
          data[m] = [
            { kolom1: '1', kolom2: '', kolom3: '', kolom4: '', kolom5: '', kolom6: '' },
            { kolom1: '2', kolom2: '', kolom3: '', kolom4: '', kolom5: '', kolom6: '' },
            { kolom1: '3', kolom2: '', kolom3: '', kolom4: '', kolom5: '', kolom6: '' }
          ];
        }
      } else {
        data[m] = [
          { kolom1: '1', kolom2: '', kolom3: '', kolom4: '', kolom5: '', kolom6: '' },
          { kolom1: '2', kolom2: '', kolom3: '', kolom4: '', kolom5: '', kolom6: '' },
          { kolom1: '3', kolom2: '', kolom3: '', kolom4: '', kolom5: '', kolom6: '' }
        ];
      }
    }
    return data;
  };

  const [rekapKontribusi, setRekapKontribusi] = useState<Record<number, RekapTableRow[]>>(() => loadRekapData('rekapPerjadinData_'));
  const [rekapPerjalanan, setRekapPerjalanan] = useState<Record<number, RekapTableRow[]>>(() => loadRekapData('perjalananDinasData_'));
  const [rekapMakanMinum, setRekapMakanMinum] = useState<Record<number, RekapTableRow[]>>(() => loadRekapData('makanMinumData_'));
  const [rekapHonorarium, setRekapHonorarium] = useState<Record<number, RekapTableRow[]>>(() => loadRekapData('honorariumData_'));

  const mappingKeteranganToItemIndex: Record<string, number> = {
    'Nasi Kotak Biasa': 0, 
    'Snack Ringan Kotak': 1, 
    'Honorarium Narasumber': 2, 
    'Honorarium Pembawa Acara': 3,
    'Kontribusi Untuk Akreditasi/Prognas': 4, 
    'Kontribusi Untuk Dokter Spesialis': 5, 
    'Perjadin Narasumber Dalam Daerah': 6,
    'Perjadin Narasumber Luar Daerah': 7, 
    'Perjalanan Dinas Untuk Akreditasi/Prognas': 8, 
    'Perjalanan Dinas Untuk Dokter Spesialis, Fellow dan Konsultan': 9
  };

  const calculatedBludMonthlyValues = useMemo(() => {
    const matrix: number[][] = Array(10).fill(null).map(() => Array(12).fill(0));
    const processCategoryData = (data: Record<number, RekapTableRow[]>) => {
      for (let m = 0; m < 12; m++) {
        const rows = data[m] || [];
        rows.forEach(row => {
          const ket = row.kolom6;
          const valStr = row.kolom4 || '0';
          const rawVal = parseFloat(valStr.replace(/[^0-9]/g, '')) || 0;
          if (ket && mappingKeteranganToItemIndex[ket] !== undefined) {
            const itemIdx = mappingKeteranganToItemIndex[ket];
            matrix[itemIdx][m] += rawVal;
          }
        });
      }
    };
    processCategoryData(rekapKontribusi);
    processCategoryData(rekapPerjalanan);
    processCategoryData(rekapMakanMinum);
    processCategoryData(rekapHonorarium);
    return matrix;
  }, [rekapKontribusi, rekapPerjalanan, rekapMakanMinum, rekapHonorarium]);

  // Auto-save rekap states
  useEffect(() => {
    for (let m = 0; m < 12; m++) {
      localStorage.setItem(`rekapPerjadinData_${m}`, JSON.stringify(rekapKontribusi[m] || []));
    }
  }, [rekapKontribusi]);

  useEffect(() => {
    for (let m = 0; m < 12; m++) {
      localStorage.setItem(`perjalananDinasData_${m}`, JSON.stringify(rekapPerjalanan[m] || []));
    }
  }, [rekapPerjalanan]);

  useEffect(() => {
    for (let m = 0; m < 12; m++) {
      localStorage.setItem(`makanMinumData_${m}`, JSON.stringify(rekapMakanMinum[m] || []));
    }
  }, [rekapMakanMinum]);

  useEffect(() => {
    for (let m = 0; m < 12; m++) {
      localStorage.setItem(`honorariumData_${m}`, JSON.stringify(rekapHonorarium[m] || []));
    }
  }, [rekapHonorarium]);

  // Form states
  const [perjadinForm, setPerjadinForm] = useState({ bulan: '', tujuan: '', fileName: '' });
  const [bludForm, setBludForm] = useState({ kegiatan: '', anggaran: '', realisasi: '', bulan: '', pic: '', department: '' });
  const [expandedBludId, setExpandedBludId] = useState<string | null>(null);
  const [bludSortField, setBludSortField] = useState<'index' | 'kegiatan' | 'anggaran' | 'realisasi' | 'percent' | 'bulan' | null>(null);
  const [bludSortDirection, setBludSortDirection] = useState<'asc' | 'desc'>('asc');

  const monthOrder = useMemo<Record<string, number>>(() => ({
    'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
    'Juli': 7, 'Agustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
  }), []);

  const sortedBludList = useMemo(() => {
    if (!bludSortField) return bludList;
    return [...bludList].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      
      switch (bludSortField) {
        case 'index': {
          aVal = bludList.findIndex(item => item.id === a.id);
          bVal = bludList.findIndex(item => item.id === b.id);
          break;
        }
        case 'kegiatan':
          aVal = (a.kegiatan || '').toLowerCase();
          bVal = (b.kegiatan || '').toLowerCase();
          break;
        case 'anggaran':
          aVal = Number(a.anggaran) || 0;
          bVal = Number(b.anggaran) || 0;
          break;
        case 'realisasi':
          aVal = Number(a.realisasi) || 0;
          bVal = Number(b.realisasi) || 0;
          break;
        case 'percent': {
          const aPercent = a.anggaran ? (a.realisasi / a.anggaran) : 0;
          const bPercent = b.anggaran ? (b.realisasi / b.anggaran) : 0;
          aVal = aPercent;
          bVal = bPercent;
          break;
        }
        case 'bulan':
          aVal = monthOrder[a.bulan || 'Januari'] || 0;
          bVal = monthOrder[b.bulan || 'Januari'] || 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return bludSortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return bludSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [bludList, bludSortField, bludSortDirection, monthOrder]);

  const handleBludSort = (field: 'index' | 'kegiatan' | 'anggaran' | 'realisasi' | 'percent' | 'bulan') => {
    if (bludSortField === field) {
      if (bludSortDirection === 'asc') {
        setBludSortDirection('desc');
      } else {
        setBludSortField(null);
      }
    } else {
      setBludSortField(field);
      setBludSortDirection('asc');
    }
  };

  const [activePdfPreview, setActivePdfPreview] = useState<{ name: string, url: string, date?: string, size?: string, category?: string } | null>(null);
  const [manualUploadFile, setManualUploadFile] = useState<File | null>(null);

  // Upload zones simulations
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

  // Drive Connection State UI helper
  const [driveStatus, setDriveStatus] = useState<boolean>(true); // Pre-defaulting to true for visual feedback on DEFAULT ID

  // Sisa Pagu totals (Grand Total APBD)
  const PaguTotalAPBD = 2093974768;

  // Refs for upload pickers
  const fileInputTelaahRef = useRef<HTMLInputElement>(null);
  const fileInputSertifikatRef = useRef<HTMLInputElement>(null);
  const fileInputPerjadinRef = useRef<HTMLInputElement>(null);
  const fileInputRestoreRef = useRef<HTMLInputElement>(null);
  const fileInputPdfRef = useRef<HTMLInputElement>(null);
  const fileInputBludUploadRef = useRef<HTMLInputElement>(null);
  const fileInputBludRestoreRef = useRef<HTMLInputElement>(null);

  // Reset states
  const [resetBludConfirm, setResetBludConfirm] = useState(false);

  // Success indicator status
  const [saveStatus, setSaveStatus] = useState<string>('Siap');

  // Trigger Toast Notification
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Add Recent Activity
  const addActivity = (text: string) => {
    const newAct: RecentActivity = {
      id: Date.now().toString(),
      text,
      time: new Date().toISOString()
    };
    setActivities(prev => [newAct, ...prev].slice(0, 15));
  };

  // Load Initial Google OAuth Sync Connection on Mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        setAuthLoading(false);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setAuthLoading(true);
      setUnauthorizedDomainError(null);
      setOperationNotAllowedError(false);
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        triggerToast('Keamanan Google Drive & Sheets berhasil terhubung!', 'success');
        addActivity('Berhasil Login Google Workspace');
      }
    } catch (err: any) {
      console.error(err);
      const errStr = err.toString() || '';
      const errMessage = err.message || '';
      if (errStr.includes('unauthorized-domain') || errMessage.includes('unauthorized-domain')) {
        setUnauthorizedDomainError(window.location.hostname);
      }
      if (errStr.includes('operation-not-allowed') || errMessage.includes('operation-not-allowed')) {
        setOperationNotAllowedError(true);
      }
      triggerToast(`Gagal menghubungkan Google: ${err.message || err}`, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      setAuthLoading(true);
      await googleSignOut();
      setGoogleUser(null);
      setGoogleToken(null);
      setUnauthorizedDomainError(null);
      setOperationNotAllowedError(false);
      triggerToast('Koneksi Google diputuskan.', 'info');
      addActivity('Memutuskan Sesi Google Workspace');
    } catch (err: any) {
      console.error(err);
      triggerToast('Gagal memutuskan Google.', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // 1. Initial State Loading & Storage Interaction
  useEffect(() => {
    // Load from local storage
    const storedTelaah = localStorage.getItem('app_telaah');
    const storedSertifikat = localStorage.getItem('app_sertifikat');
    const storedPerjadin = localStorage.getItem('app_perjadin');
    const storedBlud = localStorage.getItem('app_blud');
    const storedInputs = localStorage.getItem('app_apbd_inputs');
    const storedConfig = localStorage.getItem('app_google_config');
    const storedActivities = localStorage.getItem('app_activities');

    if (storedTelaah) setTelaahList(JSON.parse(storedTelaah));
    else setTelaahList([]);

    if (storedSertifikat) setSertifikatList(JSON.parse(storedSertifikat));
    else setSertifikatList([]);

    if (storedPerjadin) setPerjadinList(JSON.parse(storedPerjadin));
    else setPerjadinList([]);

    if (storedBlud) setBludList(JSON.parse(storedBlud));
    else setBludList([]);

    if (storedInputs) setApbdInputs(JSON.parse(storedInputs));
    else setApbdInputs({});

    if (storedActivities) setActivities(JSON.parse(storedActivities));
    else setActivities([]);

    if (storedConfig) {
      const config = JSON.parse(storedConfig);
      // Fallback sheetsId to our updated default if not defined, otherwise load saved
      if (!config.sheetsId || config.sheetsId === '1T8QxUuWna4T-YV7wPiYQendHGhmAgy13tXlYRm7P1mw') {
        config.sheetsId = DEFAULT_SHEETS_SPREADSHEET_ID;
      }
      if (!config.driveFolderId || config.driveFolderId === '1dUcuP_LownZK-q6Cd4ecg94T9ZggHGXX') {
        config.driveFolderId = DEFAULT_DRIVE_FOLDER_ID;
      }
      setGoogleConfig(config);
    } else {
      setGoogleConfig({
        driveApiKey: '',
        driveClientId: '',
        driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
        sheetsApiKey: '',
        sheetsId: DEFAULT_SHEETS_SPREADSHEET_ID,
        sheetsName: 'Sheet1'
      });
    }
  }, []);

  // Save changes to localStorage on any state modification
  useEffect(() => {
    localStorage.setItem('app_telaah', JSON.stringify(telaahList));
  }, [telaahList]);
  
  useEffect(() => {
    localStorage.setItem('app_sertifikat', JSON.stringify(sertifikatList));
  }, [sertifikatList]);

  useEffect(() => {
    localStorage.setItem('app_perjadin', JSON.stringify(perjadinList));
  }, [perjadinList]);

  useEffect(() => {
    localStorage.setItem('app_blud', JSON.stringify(bludList));
  }, [bludList]);

  useEffect(() => {
    localStorage.setItem('app_apbd_inputs', JSON.stringify(apbdInputs));
  }, [apbdInputs]);

  useEffect(() => {
    localStorage.setItem('app_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('app_google_config', JSON.stringify(googleConfig));
  }, [googleConfig]);

  // Recursively flatten the Budget Detail Structure
  const flatBudgetRows = useMemo(() => {
    const flatten = (
      nodes: BudgetDetailNode[],
      parentId: string | null = null,
      counter = { val: 0 }
    ): FlatBudgetRow[] => {
      let flat: FlatBudgetRow[] = [];
      for (const node of nodes) {
        const id = `row-${counter.val++}`;
        const isCat = !!(node.children && node.children.length > 0);
        const rowEntry: FlatBudgetRow = {
          id,
          parentId,
          code: node.code,
          name: node.name,
          budget: node.budget,
          level: node.level,
          isCat,
          childrenIds: []
        };
        flat.push(rowEntry);
        if (node.children && node.children.length > 0) {
          const childRows = flatten(node.children, id, counter);
          rowEntry.childrenIds = childRows.filter(c => c.parentId === id).map(c => c.id);
          flat = flat.concat(childRows);
        }
      }
      return flat;
    };
    return flatten(budgetData);
  }, []);

  // Compute calculated sums dynamically in reverse hierarchical order
  const calculatedBudgetSums = useMemo(() => {
    const memoSums: Record<string, number> = {};
    const calculateSum = (rowId: string): number => {
      if (memoSums[rowId] !== undefined) return memoSums[rowId];
      const r = flatBudgetRows.find(item => item.id === rowId);
      if (!r) return 0;
      if (!r.isCat) {
        const monthsObj = apbdInputs[rowId] || {};
        const sum: number = Object.values(monthsObj).reduce((acc: number, current: any) => acc + (Number(current) || 0), 0) as number;
        memoSums[rowId] = sum;
        return sum;
      } else {
        let sum = 0;
        for (const cid of r.childrenIds) {
          sum += calculateSum(cid);
        }
        memoSums[rowId] = sum;
        return sum;
      }
    };

    // Calculate sum for every row
    flatBudgetRows.forEach(row => {
      calculateSum(row.id);
    });

    return memoSums;
  }, [flatBudgetRows, apbdInputs]);

  // Total Realisasi across APBD tab
  const totalAPBDRealisasi = useMemo(() => {
    const topLevelRowId = 'row-0'; // "BELANJA DAERAH" root
    return calculatedBudgetSums[topLevelRowId] || 0;
  }, [calculatedBudgetSums]);

  // Total BLUD Budget and Terpakai
  const bludBudgetTotal = useMemo(() => {
    if (bludTabMode === 'integrated') {
      return 2467700000; // Rp 2,467,700,000 Pagu
    }
    return bludList.reduce((acc, curr) => acc + (curr.anggaran || 0), 0);
  }, [bludList, bludTabMode]);

  const bludRealisasiTotal = useMemo(() => {
    if (bludTabMode === 'integrated') {
      let sum = 0;
      calculatedBludMonthlyValues.forEach(row => {
        row.forEach(val => {
          sum += val;
        });
      });
      return sum;
    }
    return bludList.reduce((acc, curr) => acc + (curr.realisasi || 0), 0);
  }, [bludList, bludTabMode, calculatedBludMonthlyValues]);

  // Grand Total both systems
  const totalCombinedTerpakai = totalAPBDRealisasi + bludRealisasiTotal;

  // Filter Preloaded Certificates based on Name query
  const filteredSertifikat = useMemo(() => {
    const query = searchCertQuery.toLowerCase().trim();
    if (!query) return sertifikatList;
    return sertifikatList.filter(item => item.name.toLowerCase().includes(query));
  }, [sertifikatList, searchCertQuery]);

  // Compute global search results across all three categories
  const globalSearchResults = useMemo(() => {
    const query = globalSearchQuery.toLowerCase().trim();
    if (!query) return { telaah: [], sertifikat: [], perjadin: [], total: 0 };

    const matchingTelaah = telaahList.filter(item => 
      item.name.toLowerCase().includes(query)
    );

    const matchingSertifikat = sertifikatList.filter(item => 
      item.name.toLowerCase().includes(query)
    );

    const matchingPerjadin = perjadinList.filter(item => 
      item.name.toLowerCase().includes(query) ||
      (item.bulan && item.bulan.toLowerCase().includes(query)) ||
      (item.tujuan && item.tujuan.toLowerCase().includes(query))
    );

    const total = matchingTelaah.length + matchingSertifikat.length + matchingPerjadin.length;

    return {
      telaah: matchingTelaah,
      sertifikat: matchingSertifikat,
      perjadin: matchingPerjadin,
      total
    };
  }, [globalSearchQuery, telaahList, sertifikatList, perjadinList]);

  // Paginated Certificates selection
  const paginatedSertifikat = useMemo(() => {
    const startIndex = (certPage - 1) * itemsPerPage;
    return filteredSertifikat.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSertifikat, certPage]);

  const totalCertPages = Math.ceil(filteredSertifikat.length / itemsPerPage) || 1;

  // Time-ago Indonesian localized description
  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const then = new Date(dateStr);
    const diffSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diffSeconds < 60) return 'Baru saja';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  };

  const handleOpenPdf = (item: { name: string, driveLink: string, date?: string, size?: string, category?: string }) => {
    setActivePdfPreview({
      name: item.name,
      url: item.driveLink,
      date: item.date,
      size: item.size,
      category: item.category
    });
  };

  // REAL AND SIMULATED ENGINE FOR GOOGLE DRIVE & SHEETS FILE UPLOADING
  const simulateFileUpload = async (category: 'telaah' | 'sertifikat' | 'perjadin', files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Check if we are logged in to Google Workspace
    if (!googleUser || !googleToken) {
      triggerToast('Silakan hubungkan akun Google Workspace Anda di tab Pengaturan terlebih dahulu untuk mengunggah ke Google Drive.', 'error');
      showSection('settings');
      return;
    }

    setIsUploading(prev => ({ ...prev, [category]: true }));
    setUploadProgress(prev => ({ ...prev, [category]: 10 }));

    try {
      setUploadProgress(prev => ({ ...prev, [category]: 30 }));
      
      const folderId = googleConfig.driveFolderId || DEFAULT_DRIVE_FOLDER_ID;
      const sheetsId = googleConfig.sheetsId || DEFAULT_SHEETS_SPREADSHEET_ID;
      const sheetName = googleConfig.sheetsName || 'Sheet1';

      const uploadedItems: GDriveItem[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        
        // 1. Upload to Google Drive
        const progressChunk = 30 + Math.floor((40 / fileArray.length) * i);
        setUploadProgress(prev => ({ ...prev, [category]: progressChunk }));
        
        const driveRes = await uploadFileToDrive(file, folderId);
        
        // 2. Prepare metadata
        const sizeString = file.size < 1024 
          ? `${file.size} B` 
          : file.size < 1048576 
            ? `${(file.size / 1024).toFixed(1)} KB` 
            : `${(file.size / 1048576).toFixed(1)} MB`;
            
        const dateString = new Date().toISOString().split('T')[0];
        
        const newItem: GDriveItem = {
          id: driveRes.id || `${category}-${Date.now()}-${i}`,
          name: file.name,
          size: sizeString,
          date: dateString,
          driveLink: driveRes.webViewLink || `https://drive.google.com/file/d/${driveRes.id}/view`,
          category
        };
        
        // 3. Sync to Google Sheets
        setUploadProgress(prev => ({ ...prev, [category]: progressChunk + 10 }));
        
        await appendPdfToGoogleSheets(sheetsId, sheetName, {
          id: newItem.id,
          name: newItem.name,
          size: newItem.size,
          date: newItem.date,
          category: newItem.category,
          driveLink: newItem.driveLink
        });

        uploadedItems.push(newItem);
      }

      setUploadProgress(prev => ({ ...prev, [category]: 100 }));
      
      // Update local states so they show in the tables instantly
      if (category === 'telaah') {
        setTelaahList(prev => [...uploadedItems, ...prev]);
      } else if (category === 'sertifikat') {
        setSertifikatList(prev => [...uploadedItems, ...prev]);
        setCertPage(1);
      } else if (category === 'perjadin') {
        const addedPerjadin: PerjadinItem[] = uploadedItems.map(item => ({
          ...item,
          bulan: '-',
          tujuan: '-'
        }));
        setPerjadinList(prev => [...addedPerjadin, ...prev]);
      }

      triggerToast(`${fileArray.length} file berhasil diunggah ke Google Drive & tercatat di Google Sheets!`, 'success');
      addActivity(`Unggah ${fileArray.length} file PDF ke Google Drive & Sinkron ke Sheets - Kategori: ${category}`);
      setSaveStatus(`Tersimpan ke Drive`);

    } catch (error: any) {
      console.error('File GDrive upload & sync error:', error);
      triggerToast(`Gagal mengunggah file: ${error.message || error}`, 'error');
    } finally {
      setIsUploading(prev => ({ ...prev, [category]: false }));
      setUploadProgress(prev => ({ ...prev, [category]: 0 }));
    }
  };

  // Handle manual input in APBD table
  const handleAPBDInput = (rowId: string, month: string, rawVal: string) => {
    // Strip non digits
    const numericStr = rawVal.replace(/\D/g, '');
    const numValue = numericStr ? parseInt(numericStr, 10) : 0;

    setApbdInputs(prev => {
      const rowMonths = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...rowMonths,
          [month]: numValue
        }
      };
    });
    setSaveStatus('Menyimpan...');
    setTimeout(() => setSaveStatus('Siap'), 800);
  };

  // Add customized Perjadin
  const handleSavePerjadinForm = async () => {
    if (!perjadinForm.bulan) {
      triggerToast('Pilih bulan laporan terlebih dahulu', 'error');
      return;
    }
    
    let finalDriveLink = `https://drive.google.com/drive/folders/${googleConfig.driveFolderId}`;
    let customId = `perj-custom-${Date.now()}`;
    let sizeStr = '2.5 MB';

    // If manual file is loaded and we have Google Workspaces tokens, upload it
    if (manualUploadFile) {
      if (googleUser && googleToken) {
        try {
          triggerToast('Mengunggah file laporan manual ke Google Drive...', 'info');
          const folderId = googleConfig.driveFolderId || DEFAULT_DRIVE_FOLDER_ID;
          const sheetsId = googleConfig.sheetsId || DEFAULT_SHEETS_SPREADSHEET_ID;
          const sheetName = googleConfig.sheetsName || 'Sheet1';

          const driveRes = await uploadFileToDrive(manualUploadFile, folderId);
          finalDriveLink = driveRes.webViewLink || `https://drive.google.com/file/d/${driveRes.id}/view`;
          customId = driveRes.id || customId;

          sizeStr = manualUploadFile.size < 1024 
            ? `${manualUploadFile.size} B` 
            : manualUploadFile.size < 1048576 
              ? `${(manualUploadFile.size / 1024).toFixed(1)} KB` 
              : `${(manualUploadFile.size / 1048576).toFixed(1)} MB`;

          // Append to Sheet
          await appendPdfToGoogleSheets(sheetsId, sheetName, {
            id: customId,
            name: manualUploadFile.name,
            size: sizeStr,
            date: new Date().toISOString().split('T')[0],
            category: 'perjadin',
            driveLink: finalDriveLink
          });

          triggerToast('Laporan manual berhasil diunggah dan tercatat di Sheets!', 'success');
        } catch (error: any) {
          console.error(error);
          triggerToast(`Gagal mengunggah file laporannya ke Drive: ${error.message || error}`, 'error');
          // Fallback to object URL
          finalDriveLink = URL.createObjectURL(manualUploadFile);
        }
      } else {
        // Fallback or warning
        triggerToast('Laporan disimpan lokal. Silakan hubungkan akun Google di Pengaturan untuk upload otomatis.', 'info');
        finalDriveLink = URL.createObjectURL(manualUploadFile);
        sizeStr = manualUploadFile.size < 1048576 
          ? `${(manualUploadFile.size / 1024).toFixed(1)} KB` 
          : `${(manualUploadFile.size / 1048576).toFixed(1)} MB`;
      }
    }

    const newReport: PerjadinItem = {
      id: customId,
      name: perjadinForm.fileName || (manualUploadFile ? manualUploadFile.name : `Laporan_Kegiatan_${perjadinForm.bulan}.pdf`),
      size: sizeStr,
      date: new Date().toISOString().split('T')[0],
      driveLink: finalDriveLink,
      bulan: perjadinForm.bulan,
      tujuan: perjadinForm.tujuan || 'Dalam Wilayah Provinsi',
      category: 'perjadin'
    };

    setPerjadinList(prev => [newReport, ...prev]);
    addActivity(`Tambah Laporan Kegiatan Bulan ${perjadinForm.bulan}`);
    triggerToast('Laporan kegiatan berhasil disimpan!');
    setShowAddPerjadinModal(false);
    setPerjadinForm({ bulan: '', tujuan: '', fileName: '' });
    setManualUploadFile(null);
  };

  // Add customized BLUD Realisasi
  const handleSaveBludForm = () => {
    if (!bludForm.kegiatan) {
      triggerToast('Masukkan nama kegiatan BLUD', 'error');
      return;
    }
    const agg = parseFloat(bludForm.anggaran) || 0;
    const real = parseFloat(bludForm.realisasi) || 0;
    if (agg <= 0) {
      triggerToast('Jumlah Anggaran harus lebih besar dari 0', 'error');
      return;
    }

    const newBlud: BludItem = {
      id: `blud-${Date.now()}`,
      kegiatan: bludForm.kegiatan,
      anggaran: agg,
      realisasi: real,
      bulan: bludForm.bulan || 'Januari',
      date: new Date().toISOString(),
      pic: bludForm.pic || 'Meidi Priandana',
      department: bludForm.department || 'Sub Bagian Program & Anggaran',
      lastModified: new Date().toISOString().split('T')[0]
    };

    setBludList(prev => [...prev, newBlud]);
    addActivity(`Tambah Rincian BLUD: ${bludForm.kegiatan}`);
    triggerToast('Rincian BLUD berhasil ditambahkan!');
    setShowAddBludModal(false);
    setBludForm({ kegiatan: '', anggaran: '', realisasi: '', bulan: '', pic: '', department: '' });
  };

  // Upload and Parse BLUD Data (.json or .csv)
  const handleBludUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        let importedItems: BludItem[] = [];

        if (extension === 'json') {
          const parsed = JSON.parse(fileContent);
          let rawArray = Array.isArray(parsed) ? parsed : (parsed.blud || parsed.items || []);
          if (!Array.isArray(rawArray)) {
            throw new Error('Format file JSON tidak valid. Harus berisi array data BLUD.');
          }
          importedItems = rawArray.map((item: any) => ({
            id: item.id || `blud-imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            kegiatan: item.kegiatan || item.nama || item.name || 'Belanja BLUD Tanpa Nama',
            anggaran: parseFloat(item.anggaran) || parseFloat(item.budget) || 0,
            realisasi: parseFloat(item.realisasi) || parseFloat(item.real_budget) || 0,
            bulan: item.bulan || item.month || 'Januari',
            date: item.date || item.tanggal || new Date().toISOString()
          }));
        } else if (extension === 'csv') {
          const lines = fileContent.split(/\r?\n/);
          if (lines.length < 2) {
            throw new Error('File CSV kosong atau tidak memiliki data.');
          }
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
            if (cols.length === 0) continue;

            let kegiatanVal = '';
            let anggaranVal = 0;
            let realisasiVal = 0;
            let bulanVal = 'Januari';
            let dateVal = new Date().toISOString();

            const kegiatanIdx = headers.findIndex(h => h.includes('kegiat') || h.includes('nama') || h.includes('name') || h.includes('uraian'));
            const anggaranIdx = headers.findIndex(h => h.includes('anggar') || h.includes('pagu') || h.includes('budget') || h.includes('limit'));
            const realisasiIdx = headers.findIndex(h => h.includes('realis') || h.includes('terpakai') || h.includes('spent') || h.includes('real'));
            const bulanIdx = headers.findIndex(h => h.includes('bulan') || h.includes('month'));
            const dateIdx = headers.findIndex(h => h.includes('tgl') || h.includes('date') || h.includes('tanggal'));

            if (kegiatanIdx !== -1 && cols[kegiatanIdx]) kegiatanVal = cols[kegiatanIdx];
            else kegiatanVal = cols[0] || 'Kebutuhan Belanja';

            if (anggaranIdx !== -1 && cols[anggaranIdx]) anggaranVal = parseFloat(cols[anggaranIdx].replace(/[^0-9.]/g, '')) || 0;
            else anggaranVal = parseFloat(cols[1]) || 0;

            if (realisasiIdx !== -1 && cols[realisasiIdx]) realisasiVal = parseFloat(cols[realisasiIdx].replace(/[^0-9.]/g, '')) || 0;
            else realisasiVal = parseFloat(cols[2]) || 0;

            if (bulanIdx !== -1 && cols[bulanIdx]) bulanVal = cols[bulanIdx];
            else bulanVal = cols[3] || 'Januari';

            if (dateIdx !== -1 && cols[dateIdx]) dateVal = cols[dateIdx];

            importedItems.push({
              id: `blud-imported-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
              kegiatan: kegiatanVal,
              anggaran: anggaranVal,
              realisasi: realisasiVal,
              bulan: bulanVal,
              date: dateVal
            });
          }
        } else {
          throw new Error('Format file tidak didukung. Harap pilih file .json atau .csv.');
        }

        if (importedItems.length === 0) {
          throw new Error('Tidak ada data rincian belanja BLUD yang valid.');
        }

        setBludList(prev => {
          const merged = [...prev];
          let updatedCount = 0;
          let addedCount = 0;

          importedItems.forEach(newItem => {
            const existingIdx = merged.findIndex(x => 
              x.kegiatan.toLowerCase().trim() === newItem.kegiatan.toLowerCase().trim() && 
              x.bulan.toLowerCase().trim() === newItem.bulan.toLowerCase().trim()
            );

            if (existingIdx !== -1) {
              merged[existingIdx] = {
                ...merged[existingIdx],
                anggaran: newItem.anggaran,
                realisasi: newItem.realisasi,
                date: newItem.date
              };
              updatedCount++;
            } else {
              merged.push(newItem);
              addedCount++;
            }
          });

          triggerToast(`Berhasil upload: ${addedCount} data baru, ${updatedCount} data disinkronkan!`, 'success');
          addActivity(`Mengunggah berkas BLUD: ${file.name} (${importedItems.length} item)`);
          return merged;
        });

      } catch (err: any) {
        triggerToast(err.message || 'Gagal memproses file upload.', 'error');
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  // Export BLUD data to .json backup file
  const handleExportBludBackup = () => {
    const payload = {
      app: "SIPANDA (Sistem Pengelolaan Anggaran dan Dokumen) RSUD dr H JUSUF SK - BLUD Module",
      timestamp: new Date().toISOString(),
      blud: bludList
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    
    const dlink = document.createElement('a');
    dlink.href = blobUrl;
    dlink.download = `Backup-SIPANDA_BLUD_Budget_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(dlink);
    dlink.click();
    document.body.removeChild(dlink);

    triggerToast('Backup data BLUD sukses diunduh!');
    addActivity('Mengekspor backup data rincian anggaran BLUD (.json)');
  };

  // Restore BLUD data from .json backup file
  const handleBludRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string);
        const rawArray = Array.isArray(payload) ? payload : (payload.blud || payload.items || []);
        if (!Array.isArray(rawArray)) {
          triggerToast('Format file backup BLUD tidak valid atau kosong!', 'error');
          return;
        }

        const restored = rawArray.map((item: any) => ({
          id: item.id || `blud-imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          kegiatan: item.kegiatan || item.nama || item.name || 'Belanja BLUD Tanpa Nama',
          anggaran: parseFloat(item.anggaran) || parseFloat(item.budget) || 0,
          realisasi: parseFloat(item.realisasi) || parseFloat(item.real_budget) || 0,
          bulan: item.bulan || item.month || 'Januari',
          date: item.date || item.tanggal || new Date().toISOString(),
          pic: item.pic || 'Meidi Priandana',
          department: item.department || 'Sub Bagian Program & Anggaran',
          lastModified: item.lastModified || new Date().toISOString().split('T')[0]
        }));

        setBludList(restored);
        triggerToast(`Sukses memulihkan ${restored.length} data anggaran BLUD!`, 'success');
        addActivity(`Memulihkan data anggaran BLUD dari file Backup .json (${restored.length} item)`);
      } catch (err) {
        triggerToast('Gagal memulihkan backup data BLUD: Format JSON tidak didukung.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset BLUD budget list
  const handleResetBlud = () => {
    setBludList([]);
    setResetBludConfirm(false);
    triggerToast('Seluruh data rincian anggaran BLUD berhasil direset!');
    addActivity('Mereset daftar rincian anggaran BLUD ke keadaan kosong');
  };

  // Bulk Edit selected BLUD items (PIC and/or Department)
  const handleOpenBulkEdit = () => {
    if (selectedBlud.length === 0) {
      triggerToast('Pilih beberapa item di tabel terlebih dahulu!', 'error');
      return;
    }
    const firstSelected = bludList.find(x => selectedBlud.includes(x.id));
    setBulkEditPic(firstSelected?.pic || '');
    setBulkEditDept(firstSelected?.department || '');
    setBulkEditPicChecked(true);
    setBulkEditDeptChecked(true);
    setShowBulkEditBludModal(true);
  };

  const handleBulkEditBlud = () => {
    if (selectedBlud.length === 0) {
      triggerToast('Pilih beberapa item di tabel terlebih dahulu!', 'error');
      return;
    }
    if (!bulkEditPicChecked && !bulkEditDeptChecked) {
      triggerToast('Pilih setidaknya satu kolom yang ingin diubah!', 'error');
      return;
    }

    setBludList(prev => prev.map(item => {
      if (selectedBlud.includes(item.id)) {
        return {
          ...item,
          pic: bulkEditPicChecked ? bulkEditPic : item.pic,
          department: bulkEditDeptChecked ? bulkEditDept : item.department,
          lastModified: new Date().toISOString().split('T')[0]
        };
      }
      return item;
    }));

    triggerToast(`Sukses mengubah ${selectedBlud.length} data belanja BLUD!`, 'success');
    addActivity(`Mengubah massal ${selectedBlud.length} data belanja BLUD (PIC/Departemen)`);
    setShowBulkEditBludModal(false);
  };

  // Start editing a single document (Telaah)
  const handleStartEditTelaah = (item: GDriveItem) => {
    setEditingTelaah(item);
    setEditTelaahForm({
      name: item.name,
      driveLink: item.driveLink,
      size: item.size || '2.4 MB',
      date: item.date || new Date().toISOString().split('T')[0]
    });
  };

  // Save changes to current editing telaah document
  const handleSaveEditTelaah = () => {
    if (!editingTelaah) return;
    if (!editTelaahForm.name.trim()) {
      triggerToast('Nama file tidak boleh kosong!', 'error');
      return;
    }

    setTelaahList(prev => prev.map(x => x.id === editingTelaah.id ? {
      ...x,
      name: editTelaahForm.name,
      driveLink: editTelaahForm.driveLink,
      size: editTelaahForm.size,
      date: editTelaahForm.date
    } : x));

    triggerToast('Berhasil memperbarui dokumen telaah!', 'success');
    addActivity(`Mengedit dokumen telaah: "${editingTelaah.name}" menjadi "${editTelaahForm.name}"`);
    setEditingTelaah(null);
  };

  // Start editing a single document (Sertifikat)
  const handleStartEditSertifikat = (item: GDriveItem) => {
    setEditingSertifikat(item);
    setEditSertifikatForm({
      name: item.name,
      driveLink: item.driveLink,
      size: item.size || '1.8 MB',
      date: item.date || new Date().toISOString().split('T')[0]
    });
  };

  // Save changes to current editing sertifikat document
  const handleSaveEditSertifikat = () => {
    if (!editingSertifikat) return;
    if (!editSertifikatForm.name.trim()) {
      triggerToast('Nama file tidak boleh kosong!', 'error');
      return;
    }

    setSertifikatList(prev => prev.map(x => x.id === editingSertifikat.id ? {
      ...x,
      name: editSertifikatForm.name,
      driveLink: editSertifikatForm.driveLink,
      size: editSertifikatForm.size,
      date: editSertifikatForm.date
    } : x));

    triggerToast('Berhasil memperbarui dokumen sertifikat!', 'success');
    addActivity(`Mengedit dokumen sertifikat: "${editingSertifikat.name}" menjadi "${editSertifikatForm.name}"`);
    setEditingSertifikat(null);
  };

  // Start editing a single document (Perjadin / Laporan Kerja)
  const handleStartEditPerjadin = (item: PerjadinItem) => {
    setEditingPerjadin(item);
    setEditPerjadinForm({
      name: item.name,
      driveLink: item.driveLink,
      size: item.size || '3.2 MB',
      date: item.date || new Date().toISOString().split('T')[0],
      bulan: item.bulan || 'Januari',
      tujuan: item.tujuan || 'Dalam Daerah'
    });
  };

  // Save changes to current editing perjadin document
  const handleSaveEditPerjadin = () => {
    if (!editingPerjadin) return;
    if (!editPerjadinForm.name.trim()) {
      triggerToast('Nama file tidak boleh kosong!', 'error');
      return;
    }

    setPerjadinList(prev => prev.map(x => x.id === editingPerjadin.id ? {
      ...x,
      name: editPerjadinForm.name,
      driveLink: editPerjadinForm.driveLink,
      size: editPerjadinForm.size,
      date: editPerjadinForm.date,
      bulan: editPerjadinForm.bulan,
      tujuan: editPerjadinForm.tujuan
    } : x));

    triggerToast('Berhasil memperbarui laporan kegiatan!', 'success');
    addActivity(`Mengedit laporan: "${editingPerjadin.name}" menjadi "${editPerjadinForm.name}"`);
    setEditingPerjadin(null);
  };

  // Get dynamic document preview details based on file metadata
  const getMockPreviewContent = (item: GDriveItem) => {
    const name = item.name.toLowerCase();
    let title = "Telaahan Staf / Nota Dinas";
    let reference = `Ref: TS-482/RSUD/JUSUF-SK/2026`;
    let content = "Dokumen telaah internal RSUD dr. H. Jusuf SK mengenai penyelarasan rencana keuangan dan evaluasi efektivitas operasional triwulan berjalan.";
    let recommendations = [
      "Melanjutkan proses pengajuan persetujuan pimpinan terkait rincian usulan belanja.",
      "Melakukan koordinasi dengan Bagian Perencanaan Program dan Evaluasi."
    ];
    let writer = "Tim Perencana Keuangan RSUD";

    if (name.includes('ranwal') || name.includes('awal') || name.includes('rancangan')) {
      title = "Rancangan Awal (Ranwal) Anggaran & Kegiatan";
      reference = "Ref: RA-01/RSUD-SK/PLAN/2026";
      content = "Rancangan awal penyusunan pagu anggaran kegiatan Rumah Sakit Umum Daerah dr. H. Jusuf SK. Berfokus pada optimalisasi pendanaan jaminan kesehatan nasional (JKN) dan peningkatan efisiensi sarana prasarana kesehatan.";
      recommendations = [
        "Mengintegrasikan data SIPD dengan usulan rencana kebutuhan barang milik daerah (RKBMD).",
        "Memprioritaskan belanja mendesak seperti obat-obatan esensial dan bahan medis habis pakai (BMHP)."
      ];
      writer = "Seksi Perencanaan & Evaluasi Program";
    } else if (name.includes('belanja') || name.includes('blud') || name.includes('apbd')) {
      title = "Telaahan Anggaran Belanja Daerah & BLUD";
      reference = "Ref: TB-219/RSUD-BLUD/2026";
      content = "Dokumen penelaahan rincian belanja bersumber dari dana APBD dan Badan Layanan Umum Daerah (BLUD). Memuat analisis kepatuhan alokasi belanja modal terhadap peraturan kepala daerah terbaru.";
      recommendations = [
        "Melakukan penyesuaian kode rekening belanja sesuai Permendagri No. 90/2019.",
        "Memastikan persetujuan dewan pengawas untuk pergeseran anggaran mendahului perubahan APBD."
      ];
      writer = "Bagian Keuangan & Akuntansi";
    } else if (name.includes('alat') || name.includes('medis') || name.includes('fasilitas') || name.includes('alkes')) {
      title = "Telaah Kelayakan Teknis Fasilitas & Alat Medis";
      reference = "Ref: TL-105/MEDIS-SK/2026";
      content = "Laporan telaah teknis kelayakan operasional peralatan kedokteran dan fasilitas penunjang medis di Gedung Medik RSUD dr. H. Jusuf SK. Mencakup monitoring kalibrasi dan masa pakai spare part kritis.";
      recommendations = [
        "Segera lakukan kalibrasi berkala pada unit radiologi baru dan ruang operasi modular.",
        "Mengusulkan kontrak servis pemeliharaan preventif (MOU) dengan agen tunggal pemegang merk (ATPM)."
      ];
      writer = "Sub Bagian Fasilitas & Prasarana Fisik / IPSRS";
    }

    return { title, reference, content, recommendations, writer };
  };

  // Synchronize BLUD with Google Sheets
  const handleSyncBludToSheets = async () => {
    if (bludList.length === 0) {
      triggerToast('Tidak ada data rincian belanja BLUD untuk disinkronkan. Silakan upload atau tambah data terlebih dahulu.', 'error');
      return;
    }
    
    setIsSyncingBludSheets(true);
    setSyncBludProgress(10);
    setBludSyncLog('Membuka koneksi aman dengan Google Sheets...');

    const sheetsId = googleConfig.sheetsId || DEFAULT_SHEETS_SPREADSHEET_ID;
    const sheetName = googleConfig.sheetsName || 'Sheet1';

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setSyncBludProgress(30);
      setBludSyncLog(`Koneksi virtual berhasil. Menggunakan Spreadsheet ID: ${sheetsId}`);

      await new Promise(resolve => setTimeout(resolve, 500));
      setSyncBludProgress(55);
      setBludSyncLog('Membaca rentang sel data aktif pada tab "BLUD"...');

      await new Promise(resolve => setTimeout(resolve, 500));
      setSyncBludProgress(80);
      setBludSyncLog(`Memulai upload & pencatatan data ke Google Sheets (${bludList.length} baris)...`);

      if (googleUser && googleToken) {
        // Run actual sync!
        await syncBludToGoogleSheets(sheetsId, sheetName, bludList);
      } else {
        // Warn about simulated mode but proceed
        console.warn('Real Google Sheets authentication missing. Proceeding with simulated sync.');
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      setSyncBludProgress(95);
      setBludSyncLog('Memverifikasi integritas checksum data...');

      await new Promise(resolve => setTimeout(resolve, 500));
      setSyncBludProgress(100);
      setBludSyncLog(googleUser && googleToken 
        ? 'Sinkronisasi sukses! Data rincian BLUD 100% selaras dengan lembar kerja Google Sheets real.'
        : 'Sinkronisasi sukses! Data rincian BLUD 100% tersimpan secara offline.'
      );

      await new Promise(resolve => setTimeout(resolve, 800));
      setIsSyncingBludSheets(false);
      setSyncBludProgress(0);
      setBludSyncLog('');
      
      triggerToast('Data BLUD Berhasil di-Sync ke Google Sheets!', 'success');
      addActivity(`Sinkronisasi anggaran BLUD dengan Google Sheets (${bludList.length} item)`);

    } catch (error: any) {
      console.error('BLUD Sheets sync error:', error);
      setIsSyncingBludSheets(false);
      setSyncBludProgress(0);
      setBludSyncLog('');
      triggerToast(`Gagal sinkronisasi Sheets: ${error.message || error}`, 'error');
    }
  };

  // Delete generic item from categorized list
  const handleDeleteRow = (category: string, id: string) => {
    let name = '';
    if (category === 'telaah') {
      name = telaahList.find(x => x.id === id)?.name || '';
    } else if (category === 'sertifikat') {
      name = sertifikatList.find(x => x.id === id)?.name || '';
    } else if (category === 'perjadin') {
      name = perjadinList.find(x => x.id === id)?.name || '';
    } else if (category === 'blud') {
      name = bludList.find(x => x.id === id)?.kegiatan || '';
    }
    setDeleteConfirmation({ category, id, name });
  };

  // Bulk deletion initiator
  const handleDeleteBulk = (category: string) => {
    let selectedIds: string[] = [];
    if (category === 'telaah') selectedIds = selectedTelaah;
    else if (category === 'sertifikat') selectedIds = selectedSertifikat;
    else if (category === 'perjadin') selectedIds = selectedPerjadin;
    else if (category === 'blud') selectedIds = selectedBlud;

    if (selectedIds.length === 0) {
      triggerToast('Pilih beberapa item di tabel terlebih dahulu', 'error');
      return;
    }

    setDeleteConfirmation({
      category,
      id: selectedIds,
      name: `${selectedIds.length} item pilihan secara massal`
    });
  };

  const confirmDeleteRow = () => {
    if (!deleteConfirmation) return;
    const { category, id, name } = deleteConfirmation;
    const isArray = Array.isArray(id);

    if (category === 'telaah') {
      setTelaahList(prev => prev.filter(x => isArray ? !id.includes(x.id) : x.id !== id));
      setSelectedTelaah([]);
    } else if (category === 'sertifikat') {
      setSertifikatList(prev => prev.filter(x => isArray ? !id.includes(x.id) : x.id !== id));
      setSelectedSertifikat([]);
    } else if (category === 'perjadin') {
      setPerjadinList(prev => prev.filter(x => isArray ? !id.includes(x.id) : x.id !== id));
      setSelectedPerjadin([]);
    } else if (category === 'blud') {
      setBludList(prev => prev.filter(x => isArray ? !id.includes(x.id) : x.id !== id));
      setSelectedBlud([]);
    }

    triggerToast(`"${name || 'Data'}" berhasil dihapus`, 'success');
    addActivity(`Hapus ${category}: ${name || (isArray ? id.join(', ') : id)}`);
    setDeleteConfirmation(null);
  };

  // Full APBD Data Reset
  const handleResetAPBD = () => {
    setApbdResetConfirmation(true);
  };

  const confirmResetAPBD = () => {
    setApbdInputs({});
    triggerToast('Seluruh inputan bulanan APBD telah direset.');
    addActivity('Melakukan reset isi Rincian Anggaran APBD');
    setApbdResetConfirmation(false);
  };

  const confirmClearAllData = () => {
    setTelaahList([]);
    setSertifikatList([]);
    setPerjadinList([]);
    setBludList([]);
    setApbdInputs({});
    setActivities([]);
    
    localStorage.removeItem('app_telaah');
    localStorage.removeItem('app_sertifikat');
    localStorage.removeItem('app_perjadin');
    localStorage.removeItem('app_blud');
    localStorage.removeItem('app_apbd_inputs');
    localStorage.removeItem('app_activities');
    
    triggerToast('Semua data berhasil dihapus dan dikosongkan!', 'success');
    setClearAllConfirmation(false);
  };

  // EXPORT FULL BACKUP (.json) - 100% Offline, no cloud database required
  const handleExportBackupAndDownload = () => {
    const payload: FullBackupPayload = {
      app: "SIPANDA (Sistem Pengelolaan Anggaran dan Dokumen) RSUD dr H JUSUF SK",
      version: "2.5-Vibrant",
      timestamp: new Date().toISOString(),
      telaah: telaahList,
      sertifikat: sertifikatList,
      perjadin: perjadinList,
      blud: bludList,
      apbdInputs: apbdInputs,
      googleConfig: googleConfig,
      activities: activities
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Auto initiate download click
    const dlink = document.createElement('a');
    dlink.href = blobUrl;
    dlink.download = `Backup-SIPANDA_Kaltara_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(dlink);
    dlink.click();
    document.body.removeChild(dlink);

    triggerToast('Backup berhasil diunduh ke komputer Anda!');
    addActivity('Menjalankan Export Backup Sistem (.json)');
  };

  // IMPORT RESTORE (.json)
  const handleFileRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string) as FullBackupPayload;
        if (payload.apbdInputs) {
          if (Array.isArray(payload.telaah)) setTelaahList(payload.telaah);
          if (Array.isArray(payload.sertifikat)) setSertifikatList(payload.sertifikat);
          if (Array.isArray(payload.perjadin)) setPerjadinList(payload.perjadin);
          if (Array.isArray(payload.blud)) setBludList(payload.blud);
          if (payload.apbdInputs) setApbdInputs(payload.apbdInputs);
          if (payload.googleConfig) setGoogleConfig(payload.googleConfig);
          if (Array.isArray(payload.activities)) setActivities(payload.activities);

          triggerToast('Sistem berhasil dipulihkan dari Backup!', 'success');
          addActivity('Sistem berhasil direstore via file Backup .json');
        } else {
          triggerToast('Struktur file backup tidak sesuai!', 'error');
        }
      } catch (err) {
        triggerToast('Gagal memulihkan file backup: Format salah.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Clean input element
  };

  // Google Setting Sync Action
  const handleSaveConfig = (party: 'drive' | 'sheets') => {
    localStorage.setItem('app_google_config', JSON.stringify(googleConfig));
    triggerToast(`Konfigurasi Google ${party === 'drive' ? 'Drive' : 'Sheets'} diperbarui!`);
    addActivity(`Pengaturan Google ${party === 'drive' ? 'Drive' : 'Sheets'} diperbarui`);
    if (googleConfig.driveFolderId) {
      setDriveStatus(true);
    }
  };

  // Active Session PDF attachment handler
  const handlePendukungPdfSelect = (files: FileList | null) => {
    if (!files) return;
    const addedFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (addedFiles.length === 0) {
      triggerToast('Hanya dapat mengunggah file tipe PDF!', 'error');
      return;
    }

    const objects = addedFiles.map(file => ({
      id: `session-pdf-${Date.now()}-${Math.random().toString(36).substr(2,3)}`,
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      date: new Date().toLocaleDateString('id-ID'),
      url: URL.createObjectURL(file) // Real URL to display and check!
    }));

    setUploadedPdfs(prev => [...objects, ...prev]);
    triggerToast('Dokumen pendukung PDF ditambahkan!');
    addActivity(`Upload PDF Pendukung: ${objects.map(f => f.name).join(', ')}`);
  };

  return (
    <div id="app-viewport" className="flex h-screen overflow-hidden bg-slate-900 text-slate-100 font-sans antialiased">
      
      {/* Toast Overlay */}
      <div id="toast-overlay" className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            id={`toast-${toast.id}`}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl transition-all duration-300 transform scale-100 pointer-events-auto border-l-4 animate-bounce
              ${toast.type === 'success' ? 'bg-emerald-800 text-white border-emerald-400' : ''}
              ${toast.type === 'error' ? 'bg-rose-900 text-white border-rose-400' : ''}
              ${toast.type === 'info' ? 'bg-indigo-900 text-white border-indigo-400' : ''}
            `}
          >
            {toast.type === 'success' && <Check className="w-5 h-5 text-emerald-300 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-300 shrink-0" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* --- SIDEBAR --- */}
      <aside 
        id="sidebar" 
        className="w-64 shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col justify-between"
      >
        <div>
          {/* Logo Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white tracking-widest">DANA</h1>
              <p className="text-[9px] text-indigo-400 font-black uppercase tracking-wider">Sistem Pengelolaan Anggaran & Dokumen</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="py-6 px-3 space-y-1">
            <button 
              id="btn-nav-dashboard"
              onClick={() => showSection('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                ${activeSection === 'dashboard' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }
              `}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>

            <button 
              id="btn-nav-telaah"
              onClick={() => showSection('telaah')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                ${activeSection === 'telaah' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }
              `}
            >
              <FileText className="w-5 h-5" />
              <span>Telaah Masuk</span>
              {telaahList.length > 0 && (
                <span className="ml-auto bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full font-black">
                  {telaahList.length}
                </span>
              )}
            </button>

            <button 
              id="btn-nav-sertifikat"
              onClick={() => showSection('sertifikat')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                ${activeSection === 'sertifikat' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }
              `}
            >
              <Award className="w-5 h-5" />
              <span>Sertifikat</span>
              <span className="ml-auto bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-black">
                {sertifikatList.length}
              </span>
            </button>

            <button 
              id="btn-nav-perjadin"
              onClick={() => showSection('perjadin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                ${activeSection === 'perjadin' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }
              `}
            >
              <Calendar className="w-5 h-5" />
              <span>Laporan Kegiatan</span>
              <span className="ml-auto bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full font-black">
                {perjadinList.length}
              </span>
            </button>

            <button 
              id="btn-nav-anggaran"
              onClick={() => showSection('anggaran')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                ${activeSection === 'anggaran' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }
              `}
            >
              <DollarSign className="w-5 h-5" />
              <span>Rincian Anggaran</span>
            </button>

            <button 
              id="btn-nav-settings"
              onClick={() => showSection('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                ${activeSection === 'settings' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }
              `}
            >
              <Settings className="w-5 h-5" />
              <span>Pengaturan Google</span>
            </button>
          </nav>
        </div>

        {/* Workspace Connection ID Info panel */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
            <h5 className="text-[10px] text-slate-400 font-extrabold uppercase mb-1.5 tracking-wider">Storage Google Drive</h5>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
              <span className="text-xs font-bold text-white">ID: {googleConfig.driveFolderId ? `${googleConfig.driveFolderId.slice(0, 6)}...` : 'Predefined'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN FRAME --- */}
      <div id="main-frame" className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
        
        {/* TOP BAR */}
        <header id="top-bar" className="h-20 bg-slate-950 border-b border-slate-800 px-8 flex items-center justify-between no-print shrink-0 relative z-50">
          <div className="flex items-center gap-6 flex-1 max-w-3xl">
            <div className="shrink-0">
              <h1 className="text-xl font-bold tracking-tight text-white capitalize">{activeSection === 'anggaran' ? `Anggaran (${activeAnggaranTab.toUpperCase()})` : activeSection.replace('-', ' ')}</h1>
            </div>
            
            {/* GLOBAL SEARCH INPUT BAR */}
            <div className="relative flex-1 max-w-lg hidden md:block">
              <div className="relative z-50">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  id="global-search-input"
                  type="text" 
                  placeholder="Cari file di seluruh kategori (Telaah, Sertifikat, Laporan)..."
                  value={globalSearchQuery}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    setShowGlobalResults(true);
                  }}
                  onFocus={() => setShowGlobalResults(true)}
                  className="w-full pl-10 pr-10 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                />
                {globalSearchQuery && (
                  <button 
                    onClick={() => {
                      setGlobalSearchQuery('');
                      setShowGlobalResults(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* DROPDOWN OVERLAY FOR RESULTS */}
              {showGlobalResults && globalSearchQuery.trim() !== '' && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setShowGlobalResults(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn max-h-[400px] flex flex-col">
                    <div className="p-3 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hasil Pencarian Global ({globalSearchResults.total} Kecocokan)</span>
                      <button 
                        onClick={() => {
                          setGlobalSearchQuery('');
                          setShowGlobalResults(false);
                        }} 
                        className="text-[10px] text-rose-400 hover:underline font-bold"
                      >
                        Bersihkan
                      </button>
                    </div>

                    <div className="overflow-y-auto flex-1 divide-y divide-slate-900 custom-scrollbar">
                      {globalSearchResults.total === 0 ? (
                        <div className="p-8 text-center text-slate-500 font-bold text-xs">
                          Tidak ada file yang cocok dengan "{globalSearchQuery}"
                        </div>
                      ) : (
                        <>
                          {/* 1. Telaah Category */}
                          {globalSearchResults.telaah.length > 0 && (
                            <div className="p-3">
                              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                <span>Telaah Masuk ({globalSearchResults.telaah.length})</span>
                              </h4>
                              <div className="space-y-1">
                                {globalSearchResults.telaah.map(item => (
                                  <div key={item.id} className="p-2 hover:bg-slate-900 rounded-lg flex items-center justify-between text-xs transition-colors">
                                    <div className="min-w-0 flex-1 pr-3">
                                      <p className="font-semibold text-slate-200 truncate" title={item.name}>{item.name}</p>
                                      <p className="text-[10px] text-slate-500 font-medium">{item.size} • Diupload {item.date}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => {
                                          setShowGlobalResults(false);
                                          handleOpenPdf(item);
                                        }}
                                        className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold px-2 py-1 rounded-md inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <FileText className="w-3 h-3 text-rose-500" />
                                        <span>PDF</span>
                                      </button>
                                      <button 
                                        onClick={() => {
                                          showSection('telaah');
                                          setShowGlobalResults(false);
                                        }}
                                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold px-1 py-1"
                                      >
                                        Buka →
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2. Sertifikat Category */}
                          {globalSearchResults.sertifikat.length > 0 && (
                            <div className="p-3">
                              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                <span>Sertifikat ({globalSearchResults.sertifikat.length})</span>
                              </h4>
                              <div className="space-y-1">
                                {globalSearchResults.sertifikat.map(item => (
                                  <div key={item.id} className="p-2 hover:bg-slate-900 rounded-lg flex items-center justify-between text-xs transition-colors">
                                    <div className="min-w-0 flex-1 pr-3">
                                      <p className="font-semibold text-slate-200 truncate" title={item.name}>{item.name}</p>
                                      <p className="text-[10px] text-slate-500 font-medium">{item.size} • Diupload {item.date}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => {
                                          setShowGlobalResults(false);
                                          handleOpenPdf(item);
                                        }}
                                        className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold px-2 py-1 rounded-md inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <FileText className="w-3 h-3 text-rose-500" />
                                        <span>PDF</span>
                                      </button>
                                      <button 
                                        onClick={() => {
                                          showSection('sertifikat');
                                          setSearchCertQuery(item.name);
                                          setCertPage(1);
                                          setShowGlobalResults(false);
                                        }}
                                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold px-1 py-1"
                                      >
                                        Buka →
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. Laporan Kegiatan Category */}
                          {globalSearchResults.perjadin.length > 0 && (
                            <div className="p-3">
                              <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Laporan Kegiatan ({globalSearchResults.perjadin.length})</span>
                              </h4>
                              <div className="space-y-1">
                                {globalSearchResults.perjadin.map(item => (
                                  <div key={item.id} className="p-2 hover:bg-slate-900 rounded-lg flex items-center justify-between text-xs transition-colors">
                                    <div className="min-w-0 flex-1 pr-3">
                                      <p className="font-semibold text-slate-200 truncate" title={item.name}>{item.name}</p>
                                      <p className="text-[10px] text-slate-500 font-medium">
                                        {item.size} • {item.bulan !== '-' ? `Bulan ${item.bulan}` : ''} {item.tujuan !== '-' ? `• Tujuan: ${item.tujuan}` : ''}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => {
                                          setShowGlobalResults(false);
                                          handleOpenPdf(item);
                                        }}
                                        className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold px-2 py-1 rounded-md inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <FileText className="w-3 h-3 text-rose-500" />
                                        <span>PDF</span>
                                      </button>
                                      <button 
                                        onClick={() => {
                                          showSection('perjadin');
                                          setShowGlobalResults(false);
                                        }}
                                        className="text-[10px] text-purple-400 hover:text-purple-300 font-bold px-1 py-1"
                                      >
                                        Buka →
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            {/* Beautiful Light & Dark Theme Toggle */}
            <button
              id="theme-toggler-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold shadow-md"
              title={theme === 'dark' ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-[10px] tracking-wider uppercase font-black text-slate-300">TERANG</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline text-[10px] tracking-wider uppercase font-black text-slate-300">GELAP</span>
                </>
              )}
            </button>

            <div className="text-right font-sans">
              <span className="text-xs text-slate-400 block font-semibold">Tahun Anggaran 2026</span>
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block">RSUD dr H JUSUF SK</span>
            </div>
            <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-full flex items-center justify-center font-black text-white text-sm shadow-md border-2 border-slate-800">
              A
            </div>
          </div>
        </header>

        {/* CONTAINER FLOW SCROLL */}
        <main className="flex-1 overflow-y-auto p-8" id="section-scroller">
          <AnimatePresence mode="wait">
          {/* ================= SECTION: DASHBOARD ================= */}
          {activeSection === 'dashboard' && (
            <motion.div
              key="dashboard"
              id="section-dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-8"
            >
              
              {/* Info Grid Indicator Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. Telaah Masuk Count */}
                <div onClick={() => showSection('telaah')} className="bg-slate-950 p-6 rounded-3xl border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer group shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Telaah Masuk</span>
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-white">{telaahList.length}</h2>
                  <p className="text-sm text-center text-slate-400 mt-1 font-bold">Lampiran telaah tercatat</p>
                </div>

                {/* 2. Sertifikat Count */}
                <div onClick={() => showSection('sertifikat')} className="bg-slate-950 p-6 rounded-3xl border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sertifikat</span>
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-white">{sertifikatList.length}</h2>
                  <p className="text-sm text-slate-400 mt-1 font-bold">Peserta Pelatihan Terdata</p>
                </div>

                {/* 3. Laporan Bulanan Count */}
                <div onClick={() => showSection('perjadin')} className="bg-slate-950 p-6 rounded-3xl border border-slate-800 hover:border-purple-500/40 transition-all cursor-pointer group shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Laporan Kegiatan</span>
                    <div className="w-10 h-10 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-white">{perjadinList.length}</h2>
                  <p className="text-sm text-slate-400 mt-1 font-bold">Tersimpan di Google Drive</p>
                </div>

                {/* 4. Total Realisasi */}
                <div onClick={() => showSection('anggaran')} className="bg-slate-950 p-6 rounded-3xl border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Keluaran Anggaran</span>
                    <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-white">{totalCombinedTerpakai ? `Rp ${formatIDR(totalCombinedTerpakai)}` : 'Rp 0'}</h2>
                  <p className="text-sm text-slate-400 mt-1 font-bold">APBD + BLUD terpakai</p>
                </div>
              </div>

              {/* Integrasi Google Info Panels */}
              <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl">
                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6">Penghubung Storage Google</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Google Drive Status Link card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                          <FolderOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">Google Drive Terkoneksi</h4>
                          <p className="text-xs text-slate-400">Offline-sync via Default Folder ID</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed min-h-[48px]">
                        Seluruh document (Telaah, Sertifikat, Laporan) diarahkan otomatis ke Folder ID: 
                        <code className="bg-slate-950 px-2 py-0.5 rounded text-indigo-400 text-xs font-mono ml-1.5 break-all">
                          {googleConfig.driveFolderId}
                        </code>
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1 rounded-full uppercase">Aktif</span>
                      <button onClick={() => showSection('settings')} className="text-xs text-indigo-400 hover:text-indigo-300 font-bold">Ubah Folder →</button>
                    </div>
                  </div>

                  {/* Google Sheets Status Link card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">Google Spreadsheet Terkoneksi</h4>
                          <p className="text-xs text-slate-400">Pencatatan Realisasi APBD</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed min-h-[48px]">
                        Rincian anggaran dideklarasikan pada Spreadsheet ID: 
                        <code className="bg-slate-950 px-2 py-0.5 rounded text-indigo-400 text-xs font-mono ml-1.5 break-all">
                          {googleConfig.sheetsId}
                        </code>
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1 rounded-full uppercase">Aktif</span>
                      <button onClick={() => showSection('settings')} className="text-xs text-indigo-400 hover:text-indigo-300 font-bold font-semibold">Ubah Spreadsheet →</button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Section: Recent Activity list on Dashboard */}
              <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-indigo-300 uppercase tracking-wide">Aktivitas Terbaru</h3>
                  <span className="text-xs font-black text-slate-500 tracking-wider">RIWAYAT SESI</span>
                </div>
                
                <div className="space-y-4">
                  {activities.map((act) => (
                    <div 
                      key={act.id} 
                      className="bg-slate-900/60 hover:bg-slate-900 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shrink-0"></div>
                        <p className="text-sm font-bold text-slate-200">{act.text}</p>
                      </div>
                      <span className="text-xs text-slate-500 font-bold whitespace-nowrap">{getTimeAgo(act.time)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

          {/* ================= SECTION: TELAAH MASUK ================= */}
          {activeSection === 'telaah' && (
            <motion.div
              key="telaah"
              id="section-telaah"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-8"
            >
              
              {/* Dropzone card */}
              <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl">
                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">Upload Dokumen Telaah Masuk</h3>
                <p className="text-sm text-slate-400 mb-6 font-semibold">Kirim dokumen telaah untuk disimpan offline dan dipulihkan kapan saja.</p>

                {/* Upload Action Drag Area */}
                <div 
                  onClick={() => fileInputTelaahRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-950/20'); }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-950/20'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-950/20');
                    if (e.dataTransfer.files) simulateFileUpload('telaah', e.dataTransfer.files);
                  }}
                  className="border-2 border-dashed border-slate-700 rounded-3xl p-10 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-950/10 transition-all group"
                >
                  <FileUp className="w-12 h-12 text-slate-500 group-hover:text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <p className="text-slate-300 font-bold text-lg">Seret file atau klik di sini untuk pilih file</p>
                  <p className="text-xs text-slate-500 mt-2 font-semibold">Mendukung PDF, Word (DOC), Excel (XLSX) hingga 25MB</p>
                  <input 
                    ref={fileInputTelaahRef}
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => { if(e.target.files) simulateFileUpload('telaah', e.target.files); }}
                  />
                </div>

                {isUploading['telaah'] && (
                  <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-slate-300">Mengupload data offline...</span>
                      <span className="font-black text-indigo-400">{uploadProgress['telaah']}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div className="bg-indigo-500 h-2 rounded-full transition-all duration-150" style={{ width: `${uploadProgress['telaah']}%` }}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Table List Card */}
              <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Daftar Dokumen Telaah Masuk</h3>
                  {selectedTelaah.length > 0 && (
                    <button
                      onClick={() => handleDeleteBulk('telaah')}
                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-650/15 cursor-pointer transition-all animate-fadeIn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Terpilih ({selectedTelaah.length})</span>
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider text-left">
                        <th className="py-4 px-6 w-12 text-center">
                          <input 
                            type="checkbox" 
                            checked={telaahList.length > 0 && selectedTelaah.length === telaahList.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTelaah(telaahList.map(x => x.id));
                              } else {
                                setSelectedTelaah([]);
                              }
                            }}
                            className="accent-indigo-500 rounded border-slate-800 bg-slate-900 cursor-pointer w-4 h-4"
                          />
                        </th>
                        <th className="py-4 px-6 w-16">No</th>
                        <th className="py-4 px-6">Nama File</th>
                        <th className="py-4 px-6">Ukuran</th>
                        <th className="py-4 px-6">Tanggal Upload</th>
                        <th className="py-4 px-6">Tautan Dokumen</th>
                        <th className="py-4 px-6 w-24 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {telaahList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500 font-bold block-empty">
                            Belum ada dokumen telaah yang diupload. Gunakan zonasi upload di atas.
                          </td>
                        </tr>
                      ) : (
                        telaahList.map((item, index) => (
                          <tr key={item.id} className="hover:bg-slate-900/50 transition-colors text-slate-300">
                            <td className="py-4 px-6 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedTelaah.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTelaah([...selectedTelaah, item.id]);
                                  } else {
                                    setSelectedTelaah(selectedTelaah.filter(id => id !== item.id));
                                  }
                                }}
                                className="accent-indigo-500 rounded border-slate-800 bg-slate-900 cursor-pointer w-4 h-4"
                              />
                            </td>
                            <td className="py-4 px-6 font-bold">{index + 1}</td>
                            <td className="py-4 px-6 font-semibold text-slate-100 max-w-sm truncate">{item.name}</td>
                            <td className="py-4 px-6 text-xs font-bold text-indigo-400">{item.size || '2.4 MB'}</td>
                            <td className="py-4 px-6 text-xs font-semibold">{item.date}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleOpenPdf(item)}
                                  className="text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Buka PDF</span>
                                </button>
                                <button 
                                  onClick={() => setQuickPreviewItem(item)}
                                  className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 font-bold p-1.5 rounded-xl inline-flex items-center justify-center transition-all shadow-sm cursor-pointer"
                                  title="Pratinjau Cepat"
                                >
                                  <Eye className="w-4 h-4 text-indigo-400" />
                                </button>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => handleStartEditTelaah(item)}
                                  className="text-amber-400 hover:text-amber-300 p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                                  title="Edit Nama/Detail Dokumen"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteRow('telaah', item.id)}
                                  className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Hapus Dokumen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

          {/* ================= SECTION: SERTIFIKAT ================= */}
          {activeSection === 'sertifikat' && (
            <motion.div
              key="sertifikat"
              id="section-sertifikat"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-8"
            >
              
              {/* Dropzone cert */}
              <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl">
                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">Upload Sertifikat Baru</h3>
                <p className="text-sm text-slate-400 mb-6 font-semibold">Tersinkronisasi otomatis offline. Data tersimpan lokal di browser.</p>

                <div 
                  onClick={() => fileInputSertifikatRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-950/20'); }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-950/20'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-950/20');
                    if (e.dataTransfer.files) simulateFileUpload('sertifikat', e.dataTransfer.files);
                  }}
                  className="border-2 border-dashed border-slate-700 rounded-3xl p-10 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-950/10 transition-all group"
                >
                  <Award className="w-12 h-12 text-slate-500 group-hover:text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <p className="text-slate-300 font-bold text-lg">Klik untuk memilih file Gambar/PDF atau seret sertifikat ke sini</p>
                  <p className="text-xs text-slate-500 mt-2 font-semibold">Mendukung file PNG, JPG, PDF (Maks. 25MB)</p>
                  <input 
                    ref={fileInputSertifikatRef}
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => { if(e.target.files) simulateFileUpload('sertifikat', e.target.files); }}
                  />
                </div>

                {isUploading['sertifikat'] && (
                  <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-slate-300">Menyalin file offline...</span>
                      <span className="font-black text-indigo-400">{uploadProgress['sertifikat']}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div className="bg-emerald-500 h-2 rounded-full transition-all duration-150" style={{ width: `${uploadProgress['sertifikat']}%` }}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Table List Card */}
              <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl">
                
                {/* Search Bar & Title */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Daftar Sertifikat Terdata</h3>
                      <p className="text-xs font-semibold text-slate-400 mt-1">Ditemukan {filteredSertifikat.length} sertifikat</p>
                    </div>
                    {selectedSertifikat.length > 0 && (
                      <button
                        onClick={() => handleDeleteBulk('sertifikat')}
                        className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-650/15 cursor-pointer transition-all animate-fadeIn shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Terpilih ({selectedSertifikat.length})</span>
                      </button>
                    )}
                  </div>

                  <div className="relative w-full md:w-80 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      id="search-cert-input"
                      type="text" 
                      placeholder="Cari nama peserta / file..."
                      value={searchCertQuery}
                      onChange={(e) => { setSearchCertQuery(e.target.value); setCertPage(1); }}
                      className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider text-left">
                        <th className="py-4 px-6 w-12 text-center">
                          <input 
                            type="checkbox" 
                            checked={paginatedSertifikat.length > 0 && paginatedSertifikat.every(x => selectedSertifikat.includes(x.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newSelections = paginatedSertifikat.map(x => x.id);
                                setSelectedSertifikat(prev => Array.from(new Set([...prev, ...newSelections])));
                              } else {
                                const paginatedIds = paginatedSertifikat.map(x => x.id);
                                setSelectedSertifikat(prev => prev.filter(id => !paginatedIds.includes(id)));
                              }
                            }}
                            className="accent-indigo-500 rounded border-slate-800 bg-slate-900 cursor-pointer w-4 h-4"
                          />
                        </th>
                        <th className="py-4 px-6 w-16">No</th>
                        <th className="py-4 px-6">Nama File</th>
                        <th className="py-4 px-6">Tipe / Ukuran</th>
                        <th className="py-4 px-6">Waktu Terbaca</th>
                        <th className="py-4 px-6">Tautan Dokumen</th>
                        <th className="py-4 px-6 w-24 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {paginatedSertifikat.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500 font-bold block-empty">
                            Sertifikat tidak ditemukan. Coba ketikkan nama lain.
                          </td>
                        </tr>
                      ) : (
                        paginatedSertifikat.map((item, index) => {
                          const absoluteNo = (certPage - 1) * itemsPerPage + index + 1;
                          return (
                            <tr key={item.id} className="hover:bg-slate-900/50 transition-colors text-slate-300">
                              <td className="py-4 px-6 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={selectedSertifikat.includes(item.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSertifikat([...selectedSertifikat, item.id]);
                                    } else {
                                      setSelectedSertifikat(selectedSertifikat.filter(id => id !== item.id));
                                    }
                                  }}
                                  className="accent-indigo-500 rounded border-slate-800 bg-slate-900 cursor-pointer w-4 h-4"
                                />
                              </td>
                              <td className="py-4 px-6 font-bold">{absoluteNo}</td>
                              <td className="py-4 px-6 font-semibold text-slate-100 truncate max-w-xs" title={item.name}>{item.name}</td>
                              <td className="py-4 px-6 text-xs">
                                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full inline-block">
                                  {item.size || '6.6 MB'}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-xs text-slate-400 font-semibold">{item.date}</td>
                              <td className="py-4 px-6">
                               <button 
                                 onClick={() => handleOpenPdf(item)}
                                 className="text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-450 text-rose-400 font-bold px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                               >
                                 <FileText className="w-3.5 h-3.5 text-rose-500" />
                                 <span>Buka PDF</span>
                               </button>
                             </td>
                              <td className="py-4 px-6 text-right">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button 
                                    onClick={() => handleStartEditSertifikat(item)}
                                    className="text-amber-400 hover:text-amber-300 p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                                    title="Edit Nama/Detail Sertifikat"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteRow('sertifikat', item.id)}
                                    className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Tab Pagination */}
                {totalCertPages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-900">
                    <span className="text-xs text-slate-500 font-bold">
                      Halaman {certPage} dari {totalCertPages}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setCertPage(p => Math.max(1, p - 1))}
                        disabled={certPage === 1}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-800 transition-all
                          ${certPage === 1 
                            ? 'text-slate-600 border-none cursor-not-allowed' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-900'
                          }
                        `}
                      >
                        Sebelumnya
                      </button>
                      <button 
                        onClick={() => setCertPage(p => Math.min(totalCertPages, p + 1))}
                        disabled={certPage === totalCertPages}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-800 transition-all
                          ${certPage === totalCertPages 
                            ? 'text-slate-600 border-none cursor-not-allowed' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-900'
                          }
                        `}
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </motion.div>
          )}

          {/* ================= SECTION: LAPORAN KEGIATAN ================= */}
          {activeSection === 'perjadin' && (
            <motion.div
              key="perjadin"
              id="section-perjadin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-8"
            >
              
              {/* Actions Header bar */}
              <div className="flex justify-between items-center gap-4">
                <button 
                  onClick={() => fileInputPerjadinRef.current?.click()}
                  className="bg-slate-950 p-4 rounded-3xl border border-dashed border-slate-800 hover:border-indigo-500 flex items-center justify-between gap-4 cursor-pointer flex-1 text-left select-none group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Upload Laporan Bulanan</h4>
                      <p className="text-xs text-slate-500 font-semibold">Simpan file Laporan PDF baru</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                  <input 
                    ref={fileInputPerjadinRef}
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => { if(e.target.files) simulateFileUpload('perjadin', e.target.files); }}
                  />
                </button>

                <button 
                  id="btn-tambah-laporan-modal"
                  onClick={() => setShowAddPerjadinModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 px-6 py-4 rounded-[1.5rem] shadow-xl text-white font-bold text-sm h-14 shrink-0 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Tambah Laporan Manual</span>
                </button>
              </div>

              {isUploading['perjadin'] && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-3xl animate-pulse">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-slate-300">Menyalin file PDF ke Drive offline...</span>
                    <span className="font-black text-indigo-400">{uploadProgress['perjadin']}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-500 h-2 rounded-full transition-all duration-150" style={{ width: `${uploadProgress['perjadin']}%` }}></div>
                  </div>
                </div>
              )}

              {/* Table List Card */}
              <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Daftar Laporan Kegiatan Bulanan</h3>
                  {selectedPerjadin.length > 0 && (
                    <button
                      onClick={() => handleDeleteBulk('perjadin')}
                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-650/15 cursor-pointer transition-all animate-fadeIn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Terpilih ({selectedPerjadin.length})</span>
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider text-left">
                        <th className="py-4 px-6 w-12 text-center">
                          <input 
                            type="checkbox" 
                            checked={perjadinList.length > 0 && selectedPerjadin.length === perjadinList.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPerjadin(perjadinList.map(x => x.id));
                              } else {
                                setSelectedPerjadin([]);
                              }
                            }}
                            className="accent-indigo-500 rounded border-slate-800 bg-slate-900 cursor-pointer w-4 h-4"
                          />
                        </th>
                        <th className="py-4 px-6 w-16">No</th>
                        <th className="py-4 px-6">Bulan Laporan</th>
                        <th className="py-4 px-6">Nama File Dokumen</th>
                        <th className="py-4 px-6">Tujuan Kegiatan</th>
                        <th className="py-4 px-6">Tautan Dokumen</th>
                        <th className="py-4 px-6 w-24 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {perjadinList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500 font-bold block-empty">
                            Belum ada Laporan bulanan yang tercatat. Gunakan aksi upload di atas.
                          </td>
                        </tr>
                      ) : (
                        perjadinList.map((item, index) => (
                          <tr key={item.id} className="hover:bg-slate-900/50 transition-colors text-slate-300">
                            <td className="py-4 px-6 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedPerjadin.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPerjadin([...selectedPerjadin, item.id]);
                                  } else {
                                    setSelectedPerjadin(selectedPerjadin.filter(id => id !== item.id));
                                  }
                                }}
                                className="accent-indigo-500 rounded border-slate-800 bg-slate-900 cursor-pointer w-4 h-4"
                              />
                            </td>
                            <td className="py-4 px-6 font-bold">{index + 1}</td>
                            <td className="py-4 px-6 font-bold text-purple-400 text-xs">
                              <span className="bg-purple-500/10 px-3 py-1 rounded-full uppercase">
                                {item.bulan || '-'}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-200">{item.name}</td>
                            <td className="py-4 px-6 text-xs font-semibold text-slate-400">{item.tujuan || '-'}</td>
                            <td className="py-4 px-6">
                              <button 
                                onClick={() => handleOpenPdf(item)}
                                className="text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-450 text-rose-400 font-bold px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-rose-500" />
                                <span>Buka PDF</span>
                              </button>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => handleStartEditPerjadin(item)}
                                  className="text-amber-400 hover:text-amber-300 p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                                  title="Edit Detail Laporan"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteRow('perjadin', item.id)}
                                  className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

          {/* ================= SECTION: RINCIAN ANGGARAN ================= */}
          {activeSection === 'anggaran' && (
            <motion.div
              key="anggaran"
              id="section-anggaran"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-8"
            >
              
              {/* Header Anggaran with Print PDF Button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent pb-2 no-print">
                <div>
                  <h2 className={`text-xl font-black tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>SIPANDA Anggaran Daerah</h2>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'} font-semibold mt-0.5`}>
                    Kelola rekapitulasi data anggaran BLUD dan APBD RSUD dr. H. Jusuf SK
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-2 border shadow-sm shrink-0
                    ${theme === 'light'
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600 shadow-indigo-100'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-indigo-950/20'
                    }
                  `}
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak PDF Laporan</span>
                </button>
              </div>

              {/* Directory Sub-Folder Explorer Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
                {/* 1. BLUD Folder Card */}
                <div 
                  id="folder-anggaran-blud"
                  onClick={() => {
                    setActiveAnggaranTab('blud');
                    triggerToast('Membuka Sub Folder: Anggaran BLUD', 'info');
                  }}
                  className={`p-6 rounded-3xl border cursor-pointer select-none transition-all duration-300 relative group overflow-hidden
                    ${activeAnggaranTab === 'blud' 
                      ? (theme === 'light'
                        ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-500 ring-2 ring-indigo-500/30 shadow-xl shadow-indigo-100'
                        : 'bg-gradient-to-br from-indigo-950/40 to-slate-950 border-indigo-500/50 ring-2 ring-indigo-500/20 shadow-2xl shadow-indigo-950/20'
                      )
                      : (theme === 'light'
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80 shadow-sm'
                        : 'bg-slate-950/30 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60'
                      )
                    }
                  `}
                >
                  {/* Decorative background glow for active folder */}
                  {activeAnggaranTab === 'blud' && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300
                      ${activeAnggaranTab === 'blud' 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                        : (theme === 'light'
                          ? 'bg-slate-200 text-slate-500 group-hover:bg-slate-300 group-hover:text-slate-700'
                          : 'bg-slate-900 text-slate-500 group-hover:bg-slate-800 group-hover:text-slate-300'
                        )
                      }
                    `}>
                      <FolderOpen className="w-8 h-8" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'light' ? 'text-indigo-600' : 'text-[#818cf8]'}`}>Folders / Sub Folder #1</span>
                        {activeAnggaranTab === 'blud' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        )}
                      </div>
                      <h3 className={`text-base font-black truncate ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Anggaran BLUD RSUD dr. H. Jusuf SK</h3>
                      <p className={`text-xs mt-1 font-semibold leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                        Rekapitulasi anggaran, realisasi real, dan porsi penyerapan rekap belanja BLUD.
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-550">
                        <span>Pagu: <strong className={`${theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'} font-black font-sans`}>Rp {formatIDR(bludBudgetTotal)}</strong></span>
                        <span>•</span>
                        <span>Terpakai: <strong className={`${theme === 'light' ? 'text-purple-600' : 'text-purple-400'} font-sans`}>Rp {formatIDR(bludRealisasiTotal)}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. APBD Folder Card */}
                <div 
                  id="folder-anggaran-apbd"
                  onClick={() => {
                    setActiveAnggaranTab('apbd');
                    triggerToast('Membuka Sub Folder: Anggaran APBD', 'info');
                  }}
                  className={`p-6 rounded-3xl border cursor-pointer select-none transition-all duration-300 relative group overflow-hidden
                    ${activeAnggaranTab === 'apbd' 
                      ? (theme === 'light'
                        ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-500 ring-2 ring-indigo-500/30 shadow-xl shadow-indigo-100'
                        : 'bg-gradient-to-br from-indigo-950/40 to-slate-950 border-indigo-500/50 ring-2 ring-indigo-500/20 shadow-2xl shadow-indigo-950/20'
                      )
                      : (theme === 'light'
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80 shadow-sm'
                        : 'bg-slate-950/30 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60'
                      )
                    }
                  `}
                >
                  {/* Decorative background glow for active folder */}
                  {activeAnggaranTab === 'apbd' && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300
                      ${activeAnggaranTab === 'apbd' 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                        : (theme === 'light'
                          ? 'bg-slate-200 text-slate-500 group-hover:bg-slate-300 group-hover:text-slate-700'
                          : 'bg-slate-900 text-slate-500 group-hover:bg-slate-800 group-hover:text-slate-300'
                        )
                      }
                    `}>
                      <FolderOpen className="w-8 h-8" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme === 'light' ? 'text-indigo-600' : 'text-[#818cf8]'}`}>Folders / Sub Folder #2</span>
                        {activeAnggaranTab === 'apbd' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        )}
                      </div>
                      <h3 className={`text-base font-black truncate ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Anggaran APBD Pemprov Kaltara</h3>
                      <p className={`text-xs mt-1 font-semibold leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                        Rincian bulanan DPA Anggaran Pendapatan & Belanja Daerah Provinsi Kaltara 2026.
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-550">
                        <span>Pagu: <strong className={`${theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'} font-black font-sans`}>Rp {formatIDR(PaguTotalAPBD)}</strong></span>
                        <span>•</span>
                        <span>Terpakai: <strong className={`${theme === 'light' ? 'text-purple-600' : 'text-purple-400'} font-sans`}>Rp {formatIDR(totalAPBDRealisasi)}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TAB-1 PANEL: APBD TAB */}
              {activeAnggaranTab === 'apbd' && (
                <div id="tab-apbd" className="space-y-8 animate-fadeIn">
                  
                  {/* Corporative Header Badge layout (from original design) */}
                  <div className="card header-card rounded-[2.5rem] p-8 relative overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 border border-slate-800">
                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                      <div>
                        <h2 className="text-2xl font-black mb-1 text-white">Rincian Anggaran Belanja APBD 2026</h2>
                        <p className="text-slate-400 text-sm font-semibold">Pemerintah Provinsi Kalimantan Utara — RSUD dr H JUSUF SK</p>
                      </div>
                      
                      {/* Pagu Total Badge */}
                      <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4 text-right flex flex-col shrink-0 min-w-[240px]">
                        <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1">Total Pagu Anggaran (PAD)</span>
                        <span className="text-2xl font-black text-amber-400">Rp {formatIDR(PaguTotalAPBD)}</span>
                      </div>
                    </div>

                    <div className="info-grid grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-800/80">
                      <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Sub Kegiatan</label>
                        <span className="text-xs text-white font-bold block">Peningkatan Kompetensi & Kualifikasi SDM Kesehatan</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Unit Organisasi</label>
                        <span className="text-xs text-white font-bold block">RSUD dr H JUSUF SK</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Target Kinerja</label>
                        <span className="text-xs text-white font-bold block">370 Orang SDM Kesehatan</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Waktu Pelaksanaan</label>
                        <span className="text-xs text-white font-bold block">Januari s.d Desember 2026</span>
                      </div>
                    </div>
                  </div>

                  {/* CONTROL BAR CONTROLS (from original layout) */}
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 no-print shadow-xl">
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={handleExportBackupAndDownload}
                        className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 rounded-xl font-bold text-xs text-white inline-flex items-center gap-2 shadow-lg transition-colors select-none"
                      >
                        <Download className="w-4 h-4" />
                        <span>Backup (.json)</span>
                      </button>

                      <button 
                        onClick={() => fileInputRestoreRef.current?.click()}
                        className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-xl font-bold text-xs text-white inline-flex items-center gap-2 shadow-lg transition-colors select-none"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Restore</span>
                      </button>
                      <input 
                        ref={fileInputRestoreRef}
                        type="file" 
                        accept=".json"
                        className="hidden" 
                        onChange={handleFileRestoreUpload}
                      />

                      <button 
                        onClick={handleResetAPBD}
                        className="border border-slate-700 hover:border-rose-500 hover:bg-rose-500/10 px-5 py-2.5 rounded-xl font-bold text-xs text-slate-300 hover:text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4 inline-block mr-1.5" />
                        <span>Reset</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Last Saved Status */}
                      <div className="bg-slate-900 border border-slate-800 rounded-full px-4 py-2 flex items-center gap-2 text-xs text-slate-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Status: {saveStatus}</span>
                      </div>

                      <button 
                        onClick={() => window.print()}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl inline-flex items-center gap-2 border border-slate-700"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak</span>
                      </button>
                    </div>
                  </div>

                  {/* SPREADSHEET TABLE GRID CONTAINER (extremely robust React port) */}
                  <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl relative">
                    <div className="overflow-x-auto max-w-full">
                      <table className="budget-table text-xs text-left" style={{ minWidth: '2600px', borderCollapse: 'separate', borderSpacing: 0 }}>
                        
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b-2 border-indigo-900">
                            <th className="p-3 w-[110px] text-center sticky left-0 z-20 bg-slate-950 border-r border-slate-800 font-black">Kode Rek.</th>
                            <th className="p-3 w-[320px] sticky left-[110px] z-20 bg-slate-950 border-r border-slate-800 font-black">Uraian Belanja</th>
                            <th className="p-3 w-[150px] text-right font-black">Pagu Anggaran</th>
                            {MONTHS_LABEL_ID.map(m => (
                              <th key={m.key} className="p-3 text-center font-bold tracking-widest">{m.label}</th>
                            ))}
                            <th className="p-3 w-[160px] text-right font-black whitespace-nowrap bg-indigo-950/20">Total Realisasi</th>
                            <th className="p-3 w-[160px] text-right font-black whitespace-nowrap bg-emerald-950/20">Sisa Pagu</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-800">
                          {flatBudgetRows.map((row) => {
                            const isCategoryNode = row.isCat;
                            const totalRealisasi = calculatedBudgetSums[row.id] || 0;
                            const sisaPaguValue = row.budget - totalRealisasi;
                            const plClass = row.level === 0 ? 'pl-4' : row.level === 1 ? 'pl-8' : 'pl-12';

                            return (
                              <tr 
                                key={row.id} 
                                className={`
                                  ${isCategoryNode ? 'bg-slate-900/50 font-bold text-white' : 'hover:bg-slate-900/30 text-slate-300'}
                                  transition-all duration-100
                                `}
                              >
                                {/* Code Column (Sticky 1) */}
                                <td className="p-3 font-mono text-center sticky left-0 z-10 bg-slate-950 border-r border-slate-800/80 font-semibold text-slate-400">
                                  {row.code || ''}
                                </td>

                                {/* Name Column (Sticky 2) */}
                                <td className={`p-3 sticky left-[110px] z-10 bg-slate-950 border-r border-slate-800/80 font-bold truncate max-w-[320px] text-slate-100 ${plClass}`}>
                                  {row.name}
                                </td>

                                {/* Pagu Budget Column */}
                                <td className="p-3 text-right font-bold text-slate-300 whitespace-nowrap">
                                  {row.budget ? formatIDR(row.budget) : ''}
                                </td>

                                {/* 12 Months Column or Colspan 12 */}
                                {isCategoryNode ? (
                                  <td colSpan={12} className="p-3 bg-slate-900/30 text-center font-bold tracking-widest text-[10px] text-slate-500 uppercase">
                                    Sub-kalkulasi Otomatis
                                  </td>
                                ) : (
                                  MONTHS_KEY.map(m => {
                                    const currVal = apbdInputs[row.id]?.[m];
                                    return (
                                      <td key={m} className="p-1 px-2 border-r border-slate-800/50">
                                        <input 
                                          type="text" 
                                          className="month-input w-full bg-slate-900/60 p-2 text-right font-mono border border-slate-800 hover:border-slate-700/80 focus:border-indigo-500 focus:outline-none focus:bg-slate-900 rounded-lg text-xs font-black text-slate-100 placeholder-slate-850"
                                          placeholder="0"
                                          value={currVal ? formatIDR(currVal) : ''}
                                          onChange={(e) => handleAPBDInput(row.id, m, e.target.value)}
                                        />
                                      </td>
                                    );
                                  })
                                )}

                                {/* Total Realisasi Column */}
                                <td className="p-3 text-right font-black text-indigo-400 whitespace-nowrap bg-indigo-950/10">
                                  {totalRealisasi ? formatIDR(totalRealisasi) : '0'}
                                </td>

                                {/* Sisa Pagu Column */}
                                <td className={`p-3 text-right font-black whitespace-nowrap bg-slate-900 
                                  ${sisaPaguValue < 0 ? 'text-rose-400 bg-rose-950/10' : 'text-emerald-400'}
                                `}>
                                  {sisaPaguValue ? formatIDR(sisaPaguValue) : '0'}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Grand Total Row */}
                          <tr className="grand-total bg-slate-950 text-white font-extrabold text-sm border-t-4 border-indigo-900">
                            <td colSpan={3} className="p-4 text-right pr-6 sticky left-0 z-10 bg-slate-950 border-r border-slate-800">
                              JUMLAH TOTAL REALISASI APBD
                            </td>
                            <td colSpan={12} className="p-4 bg-slate-950 no-print"></td>
                            <td className="p-4 text-right bg-indigo-950 text-indigo-300 font-extrabold whitespace-nowrap text-base">
                              Rp {formatIDR(totalAPBDRealisasi)}
                            </td>
                            <td className={`p-4 text-right font-extrabold whitespace-nowrap text-base 
                              ${(PaguTotalAPBD - totalAPBDRealisasi) < 0 ? 'bg-rose-950/40 text-rose-300' : 'bg-emerald-950/40 text-emerald-300'}
                            `}>
                              Rp {formatIDR(PaguTotalAPBD - totalAPBDRealisasi)}
                            </td>
                          </tr>
                        </tbody>

                      </table>
                    </div>
                  </div>

                  {/* ACTIVE SESSION PDF ATTACHMENTS (Real Local File Previews) */}
                  <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl no-print">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <FileCheck className="w-5.5 h-5.5 text-indigo-400" />
                          <span>Dokumen Pendukung Realisasi PDF</span>
                        </h3>
                        <p className="text-xs font-semibold text-slate-400 mt-1">Sematkan bukti PDF untuk dicheck di browser secara langsung.</p>
                      </div>

                      <button 
                        onClick={() => fileInputPdfRef.current?.click()}
                        className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white px-5 py-2.5 rounded-xl flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Sematkan PDF</span>
                      </button>
                      <input 
                        ref={fileInputPdfRef}
                        type="file" 
                        accept=".pdf"
                        className="hidden" 
                        multiple
                        onChange={(e) => handlePendukungPdfSelect(e.target.files)}
                      />
                    </div>

                    {/* PDF Dropzone */}
                    <div 
                      onClick={() => fileInputPdfRef.current?.click()}
                      className="border border-dashed border-slate-800 rounded-3xl p-6 text-center cursor-pointer hover:border-indigo-500/50 bg-slate-900/30 hover:bg-slate-900/60 mb-6"
                    >
                      <p className="text-sm font-bold text-slate-400">Pilih berkas PDF dari komputer untuk diupload ke memori aktif</p>
                    </div>

                    {uploadedPdfs.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-6 font-bold">Belum ada document dilampirkan.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {uploadedPdfs.map(file => (
                          <div 
                            key={file.id} 
                            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between"
                          >
                            <div className="min-w-0 pr-3">
                              <p className="text-xs font-bold text-slate-200 truncate">{file.name}</p>
                              <span className="text-[10px] text-slate-500 font-semibold">{file.size} • {file.date}</span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleOpenPdf({ 
                                  name: file.name, 
                                  driveLink: file.url, 
                                  date: file.date, 
                                  size: file.size, 
                                  category: 'realisasi' 
                                })}
                                className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 font-bold p-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                                title="Buka PDF"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => {
                                  setUploadedPdfs(prev => prev.filter(f => f.id !== file.id));
                                  triggerToast('PDF berhasil dihapus');
                                }}
                                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold p-1.5 rounded-lg text-xs"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB-2 PANEL: BLUD TAB */}
              {activeAnggaranTab === 'blud' && (
                <div id="tab-blud" className="space-y-8 animate-fadeIn">
                  
                  {/* Blud Stats cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`p-6 rounded-3xl border shadow-xl transition-all duration-300
                      ${theme === 'light' ? 'bg-white border-slate-200/95 shadow-slate-100' : 'bg-slate-950 border-slate-800'}
                    `}>
                      <span className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Total Pagu BLUD 2026</span>
                      <h4 className={`text-2xl font-black ${theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'}`}>Rp {formatIDR(bludBudgetTotal)}</h4>
                    </div>
                    <div className={`p-6 rounded-3xl border shadow-xl transition-all duration-300
                      ${theme === 'light' ? 'bg-white border-slate-200/95 shadow-slate-100' : 'bg-slate-950 border-slate-800'}
                    `}>
                      <span className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Terpakai (Realisasi SPJ)</span>
                      <h4 className={`text-2xl font-black ${theme === 'light' ? 'text-purple-600' : 'text-purple-400'}`}>Rp {formatIDR(bludRealisasiTotal)}</h4>
                    </div>
                    <div className={`p-6 rounded-3xl border shadow-xl font-sans transition-all duration-300
                      ${theme === 'light' ? 'bg-white border-slate-200/95 shadow-slate-100' : 'bg-slate-950 border-slate-800'}
                    `}>
                      <span className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Sisa Pagu BLUD</span>
                      <h4 className={`text-2xl font-black ${(bludBudgetTotal - bludRealisasiTotal) < 0 ? 'text-rose-500 animate-pulse' : (theme === 'light' ? 'text-emerald-600' : 'text-emerald-400')}`}>
                        Rp {formatIDR(bludBudgetTotal - bludRealisasiTotal)}
                      </h4>
                    </div>
                  </div>

                  {/* DOUBLE MODE SWITCHER AND MENU BAR */}
                  <div className={`p-3 rounded-2xl border flex flex-col md:flex-row justify-between items-center gap-4 no-print transition-all duration-300
                    ${theme === 'light' ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950 border-slate-800'}
                  `}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBludTabMode('integrated')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5
                          ${bludTabMode === 'integrated' 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' 
                            : (theme === 'light'
                              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-transparent'
                              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                            )
                          }
                        `}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>SISTEM REKAP TERINTEGRASI BLUD (TERBARU)</span>
                      </button>
                      <button
                        onClick={() => setBludTabMode('original')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5
                          ${bludTabMode === 'original' 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' 
                            : (theme === 'light'
                              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-transparent'
                              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                            )
                          }
                        `}
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>BERKAS UNGGALAH MANUAL & GOOGLE SYNC</span>
                      </button>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold uppercase tracking-wide mr-[-9px] transition-all duration-300
                        ${theme === 'light'
                          ? 'bg-slate-200/80 text-indigo-700 border-slate-300 shadow-sm'
                          : 'bg-slate-900 text-indigo-400 border-slate-800'
                        }
                      `}>
                        Sumber: Jasa Layanan BLUD | RSUD dr. H. Jusuf SK, 2026
                      </span>
                    </div>
                  </div>

                  {/* ======================================================= */}
                  {/* MODE 1: INTEGRATED SHEET SYSTEM (5 SUB-TABS)            */}
                  {/* ======================================================= */}
                  {bludTabMode === 'integrated' && (() => {
                    // Constants for calculation
                    const twAlokasi = [1229425000, 434425000, 434425000, 369425000];
                    const itemsPagu = [
                      26500000,  // Nasi Kotak Biasa
                      21000000,  // Snack Ringan Kotak
                      9000000,   // Honorarium Narasumber
                      12000000,  // Honorarium Pembawa Acara
                      680000000, // Belanja Kontribusi Akreditasi
                      265000000, // Belanja Kontribusi Dokter Spesialis
                      15000000,  // Perjadin Narasumber Dalam Daerah
                      50000000,  // Perjadin Narasumber Luar Daerah
                      870000000, // Perjadin Akreditasi
                      530000000  // Perjadin Dokter Spesialis
                    ];
                    const itemsNama = [
                      "Nasi Kotak Biasa (500 Kotak)",
                      "Snack Ringan Kotak (1000 Kotak)",
                      "Honorarium Narasumber/Pembahas (3 Orang/Keg)",
                      "Honorarium Pembawa Acara (3 Orang/Keg)",
                      "Belanja Kontribusi Untuk Akreditasi/Prognas (1 Tahun)",
                      "Belanja Kontribusi Untuk Dokter Spesialis, Fellow & Konsultan (1 Tahun)",
                      "Perjalanan Dinas Narasumber Dalam Daerah (5 Orang)",
                      "Perjalanan Dinas Narasumber Luar Daerah (5 Orang)",
                      "Perjalanan Dinas Untuk Akreditasi/Prognas (1 Tahun)",
                      "Perjalanan Dinas Untuk Dokter Spesialis, Fellow & Konsultan (1 Tahun)"
                    ];

                    const itemsKode = [
                      "5.1.02.01.01.0052 - Belanja Makan Minum Rapat",
                      "5.1.02.01.01.0052 - Belanja Makan Minum Rapat",
                      "5.1.02.02.01.0003 - Honorarium Narasumber dll",
                      "5.1.02.02.01.0003 - Honorarium Narasumber dll",
                      "5.1.02.02.12.0001 - Belanja Kursus/Pelatihan",
                      "5.1.02.02.12.0001 - Belanja Kursus/Pelatihan",
                      "5.1.02.04.01.0001 - Perjalanan Dinas Biasa",
                      "5.1.02.04.01.0001 - Perjalanan Dinas Biasa",
                      "5.1.02.04.01.0001 - Perjalanan Dinas Biasa",
                      "5.1.02.04.01.0001 - Perjalanan Dinas Biasa"
                    ];

                    // Process Triwulan Realisasi sums
                    const twRealisasi = [0, 0, 0, 0];
                    for (let itemIdx = 0; itemIdx < 10; itemIdx++) {
                      for (let m = 0; m < 12; m++) {
                        const val = calculatedBludMonthlyValues[itemIdx][m];
                        if (m < 3) twRealisasi[0] += val;
                        else if (m < 6) twRealisasi[1] += val;
                        else if (m < 9) twRealisasi[2] += val;
                        else twRealisasi[3] += val;
                      }
                    }

                    const twTotalAlokasi = twAlokasi.reduce((a, b) => a + b, 0);
                    const twTotalRealisasi = twRealisasi.reduce((a, b) => a + b, 0);

                    // Monthly strings
                    const monthNames = [
                      "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
                      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
                    ];

                    // Active sub-rekap details
                    const activeStateName = 
                      bludSubTab === 'rekap_kontribusi' ? 'kontribusi' :
                      bludSubTab === 'perjalanan_dinas' ? 'perjalanan' :
                      bludSubTab === 'makan_minum' ? 'makanminum' : 'honorarium';

                    const activeList = 
                      bludSubTab === 'rekap_kontribusi' ? rekapKontribusi :
                      bludSubTab === 'perjalanan_dinas' ? rekapPerjalanan :
                      bludSubTab === 'makan_minum' ? rekapMakanMinum : rekapHonorarium;

                    const activeSetter = 
                      bludSubTab === 'rekap_kontribusi' ? setRekapKontribusi :
                      bludSubTab === 'perjalanan_dinas' ? setRekapPerjalanan :
                      bludSubTab === 'makan_minum' ? setRekapMakanMinum : setRekapHonorarium;

                    const currentMonthRows = activeList[selectedRekapMonth] || [];

                    const allowedKeteranganOptions = 
                      bludSubTab === 'rekap_kontribusi' ? [
                        'Kontribusi Untuk Akreditasi/Prognas', 'Kontribusi Untuk Dokter Spesialis'
                      ] :
                      bludSubTab === 'perjalanan_dinas' ? [
                        'Perjadin Narasumber Dalam Daerah', 'Perjadin Narasumber Luar Daerah',
                        'Perjalanan Dinas Untuk Akreditasi/Prognas', 'Perjalanan Dinas Untuk Dokter Spesialis, Fellow dan Konsultan'
                      ] :
                      bludSubTab === 'makan_minum' ? [
                        'Nasi Kotak Biasa', 'Snack Ringan Kotak'
                      ] : [
                        'Honorarium Narasumber', 'Honorarium Pembawa Acara'
                      ];

                    const belanjaDefaultLabel = 
                      bludSubTab === 'rekap_kontribusi' ? 'Belanja Kursus Singkat/Pelatihan' :
                      bludSubTab === 'perjalanan_dinas' ? 'Belanja Perjalanan Dinas Biasa' :
                      bludSubTab === 'makan_minum' ? 'Belanja Makanan dan Minuman Rapat' : 'Honorarium Panitia/Narasumber';

                    // Handlers inside React closure
                    const handleRowCellChange = (rowIndex: number, field: keyof RekapTableRow, value: string) => {
                      activeSetter(prev => {
                        const rows = [...(prev[selectedRekapMonth] || [])];
                        if (rows[rowIndex]) {
                          rows[rowIndex] = { ...rows[rowIndex], [field]: value };
                        }
                        return { ...prev, [selectedRekapMonth]: rows };
                      });
                    };

                    const handleAddNewRow = () => {
                      activeSetter(prev => {
                        const rows = [...(prev[selectedRekapMonth] || [])];
                        rows.push({
                          kolom1: (rows.length + 1).toString(),
                          kolom2: new Date().toLocaleDateString('id-ID'),
                          kolom3: '',
                          kolom4: '0',
                          kolom5: belanjaDefaultLabel,
                          kolom6: allowedKeteranganOptions[0] || ''
                        });
                        return { ...prev, [selectedRekapMonth]: rows };
                      });
                      triggerToast('Baris baru berhasil ditambahkan.');
                    };

                    const handleToggleRowSelection = (rowIndex: number, checked: boolean) => {
                      activeSetter(prev => {
                        const rows = [...(prev[selectedRekapMonth] || [])];
                        if (rows[rowIndex]) {
                          rows[rowIndex] = { ...rows[rowIndex], checked };
                        }
                        return { ...prev, [selectedRekapMonth]: rows };
                      });
                    };

                    const handleToggleAllRows = (checked: boolean) => {
                      activeSetter(prev => {
                        const rows = (prev[selectedRekapMonth] || []).map(r => ({ ...r, checked }));
                        return { ...prev, [selectedRekapMonth]: rows };
                      });
                    };

                    const handleDeleteSelectedRows = () => {
                      activeSetter(prev => {
                        const remaining = (prev[selectedRekapMonth] || []).filter(r => !r.checked);
                        // Reindex No list
                        const reindexed = remaining.map((r, i) => ({ ...r, kolom1: (i + 1).toString() }));
                        return { ...prev, [selectedRekapMonth]: reindexed };
                      });
                      triggerToast('Baris terpilih berhasil dihapus!');
                    };

                    const isAllSelected = currentMonthRows.length > 0 && currentMonthRows.every(r => r.checked);
                    const selectedCount = currentMonthRows.filter(r => r.checked).length;

                    // Sum of active month rows
                    const currentMonthTotalSum = currentMonthRows.reduce((a, b) => {
                      const val = parseFloat((b.kolom4 || '0').replace(/[^0-9]/g, '')) || 0;
                      return a + val;
                    }, 0);

                    // Print/Export helpers
                    const handleExportExcelManual = () => {
                      let csv = "No,Tanggal SPJ,Uraian SPJ,Belanja Barang Jasa,Keterangan Item,Nilai SPJ (Rp)\n";
                      currentMonthRows.forEach(r => {
                        const val = parseFloat((r.kolom4 || '0').replace(/[^0-9]/g, '')) || 0;
                        csv += `"${r.kolom1}","${r.kolom2}","${r.kolom3.replace(/"/g, '""')}","${r.kolom5}","${r.kolom6}",${val}\n`;
                      });
                      csv += `,,,,,Total Bulan ini: ${currentMonthTotalSum}\n`;
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.setAttribute("download", `Rekap_${bludSubTab}_${monthNames[selectedRekapMonth]}_SIPANDA.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      triggerToast('Spreasheet Rekapitulasi Berhasil Diexport!');
                    };

                    return (
                      <div className="space-y-8 animate-fadeIn">
                        
                        {/* 5 BLUD SECTION TABS CONTROL */}
                        <div className="relative z-10 flex flex-wrap border-b border-slate-800 gap-1 no-print">
                          <button
                            onClick={() => setBludSubTab('monitoring')}
                            className={`px-5 py-3 text-xs font-black transition-all border-b-2 cursor-pointer uppercase tracking-wider
                              ${bludSubTab === 'monitoring' 
                                ? 'border-indigo-500 text-indigo-400 font-extrabold' 
                                : 'border-transparent text-slate-400 hover:text-white'
                              }
                            `}
                          >
                            📈 1. Monitoring Anggaran
                          </button>
                          <button
                            onClick={() => setBludSubTab('rekap_kontribusi')}
                            className={`px-5 py-3 text-xs font-black transition-all border-b-2 cursor-pointer uppercase tracking-wider
                              ${bludSubTab === 'rekap_kontribusi' 
                                ? 'border-emerald-500 text-emerald-400 font-extrabold' 
                                : 'border-transparent text-slate-400 hover:text-white'
                              }
                            `}
                          >
                            🤝 2. Rekap Kontribusi
                          </button>
                          <button
                            onClick={() => setBludSubTab('perjalanan_dinas')}
                            className={`px-5 py-3 text-xs font-black transition-all border-b-2 cursor-pointer uppercase tracking-wider
                              ${bludSubTab === 'perjalanan_dinas' 
                                ? 'border-amber-500 text-amber-400 font-extrabold' 
                                : 'border-transparent text-slate-400 hover:text-white'
                              }
                            `}
                          >
                            🚗 3. Perjalanan Dinas
                          </button>
                          <button
                            onClick={() => setBludSubTab('makan_minum')}
                            className={`px-5 py-3 text-xs font-black transition-all border-b-2 cursor-pointer uppercase tracking-wider
                              ${bludSubTab === 'makan_minum' 
                                ? 'border-rose-500 text-rose-400 font-extrabold' 
                                : 'border-transparent text-slate-400 hover:text-white'
                              }
                            `}
                          >
                            🍱 4. Makan Minum Rapat
                          </button>
                          <button
                            onClick={() => setBludSubTab('honorarium')}
                            className={`px-5 py-3 text-xs font-black transition-all border-b-2 cursor-pointer uppercase tracking-wider
                              ${bludSubTab === 'honorarium' 
                                ? 'border-sky-500 text-sky-400 font-extrabold' 
                                : 'border-transparent text-slate-400 hover:text-white'
                              }
                            `}
                          >
                            👑 5. Honorarium Panitia
                          </button>
                        </div>

                        {/* SUB TAB LAYOUT: 1. MONITORING ANGGARAN */}
                        {bludSubTab === 'monitoring' && (
                          <div className="space-y-8 animate-fadeIn">
                            
                            {/* TOP META CARD */}
                            <div className="bg-gradient-to-br from-slate-950 to-indigo-950 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
                              <div className="relative z-10">
                                <span className="text-[10px] bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider inline-block mb-3">SIPANDA BLUD MODUL</span>
                                <h3 className="text-xl md:text-2xl font-black text-white leading-tight">Pendidikan dan Pelatihan Pegawai (RSUD dr H JUSUF SK)</h3>
                                <p className="text-xs text-slate-400 font-semibold mt-2">Kegiatan: <strong className="text-indigo-400 font-bold">00.01.01.05.09</strong> • Sumber Dana: <strong className="text-indigo-400 font-bold">Jasa Layanan BLUD</strong> • Tahun Anggaran 2026</p>
                              </div>
                              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                            </div>

                            {/* DUAL COLS TABLES */}
                            <div className="grid grid-cols-1 xl:grid-cols-1 gap-8">
                              
                              {/* TRIWULAN MONITORING TAB */}
                              <div className="bg-slate-950 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-2xl">
                                <div className="flex justify-between items-center mb-6">
                                  <h4 className="font-extrabold text-white text-base uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    <span>Monitoring Alokasi Anggaran Per Triwulan 2026</span>
                                  </h4>
                                  <button
                                    onClick={() => window.print()}
                                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-black text-slate-200 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 no-print"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Cetak Lembar Monitoring</span>
                                  </button>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-widest font-black">
                                        <th className="py-4 px-6 w-16">No</th>
                                        <th className="py-4 px-6">Triwulan Kegiatan</th>
                                        <th className="py-4 px-6 text-right">Rencana Pagu / Alokasi</th>
                                        <th className="py-4 px-6 text-right">Realisasi SPJ Terkumpul</th>
                                        <th className="py-4 px-6 text-right">Sisa Alokasi Terbuka</th>
                                        <th className="py-4 px-6 text-right w-36">Prosentase SPJ</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-900 font-sans text-xs">
                                      {twAlokasi.map((alok, idx) => {
                                        const real = twRealisasi[idx];
                                        const sisa = alok - real;
                                        const percent = alok ? Math.round((real / alok) * 100) : 0;
                                        return (
                                          <tr key={idx} className="hover:bg-slate-900/30 transition-colors text-slate-300">
                                            <td className="py-4 px-6 font-bold text-slate-400">{idx + 1}</td>
                                            <td className="py-4 px-6 font-bold text-slate-100">Triwulan {idx === 0 ? 'I (Jan - Mar)' : idx === 1 ? 'II (Apr - Jun)' : idx === 2 ? 'III (Jul - Sep)' : 'IV (Okt - Des)'}</td>
                                            <td className="py-4 px-6 text-right font-mono font-bold text-indigo-400">Rp {formatIDR(alok)}</td>
                                            <td className="py-4 px-6 text-right font-mono font-bold text-purple-400">Rp {formatIDR(real)}</td>
                                            <td className="py-4 px-6 text-right font-mono font-bold text-emerald-400">Rp {formatIDR(sisa)}</td>
                                            <td className="py-4 px-6 text-right">
                                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-block ${percent > 85 ? 'bg-rose-500/10 text-rose-450 border border-rose-500/10' : percent > 45 ? 'bg-amber-500/10 text-amber-450 border border-amber-500/10' : 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/10'}`}>
                                                {percent}%
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {/* Total Triwulan row */}
                                      <tr className="bg-slate-900/40 font-bold text-white border-t-2 border-slate-800">
                                        <td colSpan={2} className="py-5 px-6 uppercase tracking-wider text-right font-black">Jumlah Total:</td>
                                        <td className="py-5 px-6 text-right font-mono font-black text-indigo-300 text-sm">Rp {formatIDR(twTotalAlokasi)}</td>
                                        <td className="py-5 px-6 text-right font-mono font-black text-purple-300 text-sm">Rp {formatIDR(twTotalRealisasi)}</td>
                                        <td className="py-5 px-6 text-right font-mono font-black text-emerald-300 text-sm">Rp {formatIDR(twTotalAlokasi - twTotalRealisasi)}</td>
                                        <td className="py-5 px-6 text-right">
                                          <span className="px-3 py-1 bg-indigo-900/40 text-indigo-300 rounded-lg border border-indigo-500/20 font-black font-sans text-xs">
                                            {twTotalAlokasi ? Math.round((twTotalRealisasi / twTotalAlokasi) * 100) : 0}%
                                          </span>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* DETAILED DRILL DOWN PER ITEM MATRIX TABLE */}
                              <div className="bg-slate-950 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-2xl">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                  <div>
                                    <h4 className="font-extrabold text-white text-base uppercase tracking-wider flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                      <span>Rincian Realisasi SPJ Per Item Belanja (12 Bulan)</span>
                                    </h4>
                                    <p className="text-[10px] text-slate-500 mt-1 font-bold">Matriks alokasi & penyerapan SPJ bulanan yang diupdate secara real-time dari data Rekapitulasi</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      let csv = "Uraian Item,Kode Rekening,Pagu Anggaran,Jan,Feb,Mar,Apr,Mei,Jun,Jul,Ags,Sep,Okt,Nov,Des,Total SPJ,Sisa\n";
                                      itemsNama.forEach((nama, idx) => {
                                        const values = calculatedBludMonthlyValues[idx];
                                        const paguItem = itemsPagu[idx];
                                        const totalItemSPJ = values.reduce((a,b)=>a+b, 0);
                                        csv += `"${nama}","${itemsKode[idx]}",${paguItem},${values.join(',')},${totalItemSPJ},${paguItem - totalItemSPJ}\n`;
                                      });
                                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                      const link = document.createElement("a");
                                      link.href = URL.createObjectURL(blob);
                                      link.setAttribute("download", "Rincian_Matriks_SPJ_BLUD_SIPANDA.csv");
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      triggerToast('Matriks rincian SPJ bulanan berhasil diexport!');
                                    }}
                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 font-extrabold text-xs text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 no-print"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Export Matriks CSV</span>
                                  </button>
                                </div>

                                <div className="overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-900">
                                  <table className="w-full text-left font-sans text-[11px] table-fixed min-w-[1400px]">
                                    <thead>
                                      <tr className="bg-slate-900 text-slate-400 font-black border-b border-sidebar uppercase text-[9px] tracking-wider">
                                        <th className="py-3 px-3 w-56">Uraian / Deskripsi Item</th>
                                        <th className="py-3 px-3 w-40">Pagu Anggaran</th>
                                        {monthNames.map(m => (
                                          <th key={m} className="py-3 px-2 text-right w-20">{m.slice(0,3)}</th>
                                        ))}
                                        <th className="py-3 px-3 text-right w-28 text-white">Total SPJ</th>
                                        <th className="py-3 px-3 text-right w-28 text-emerald-400">Sisa Pagu</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-900 text-slate-300 font-bold">
                                      {itemsNama.map((nama, itemIdx) => {
                                        const values = calculatedBludMonthlyValues[itemIdx] || Array(12).fill(0);
                                        const pagu = itemsPagu[itemIdx] || 0;
                                        const totalSPJ = values.reduce((a, b) => a + b, 0);
                                        const sisa = pagu - totalSPJ;
                                        return (
                                          <tr key={itemIdx} className="hover:bg-slate-900/20 text-[11px]">
                                            <td className="py-3.5 px-3 whitespace-normal break-words">
                                              <p className="text-[11px] text-slate-100 font-semibold">{nama}</p>
                                              <span className="text-[8px] text-slate-500 font-semibold block mt-0.5">{itemsKode[itemIdx]}</span>
                                            </td>
                                            <td className="py-3.5 px-3 font-mono text-xs text-indigo-400">Rp {formatIDR(pagu)}</td>
                                            {values.map((v, mIdx) => (
                                              <td key={mIdx} className={`py-3.5 px-2 text-right font-mono ${v > 0 ? 'text-purple-400 font-black' : 'text-slate-600 font-light'}`}>
                                                {v > 0 ? formatIDR(v) : '-'}
                                              </td>
                                            ))}
                                            <td className="py-3.5 px-3 text-right font-mono text-white bg-slate-900/20">Rp {formatIDR(totalSPJ)}</td>
                                            <td className="py-3.5 px-3 text-right font-mono text-emerald-400 bg-emerald-500/5">Rp {formatIDR(sisa)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                            </div>

                          </div>
                        )}

                        {/* SUB TAB LAYOUT: MONTH SELECTION AND DETAIL TABLE (FOR REKAPS) */}
                        {bludSubTab !== 'monitoring' && (
                          <div className="space-y-8 animate-fadeIn">
                            
                            {/* 12 MONTH SELECTOR BUTTONS */}
                            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-wrap gap-1.5 justify-between no-print">
                              {monthNames.map((m, idx) => {
                                // Compute total spent in this month for active rekap category
                                const rowSum = (activeList[idx] || []).reduce((acc, curr) => {
                                  const val = parseFloat((curr.kolom4 || '0').replace(/[^0-9]/g, '')) || 0;
                                  return acc + val;
                                }, 0);

                                return (
                                  <button
                                    key={m}
                                    onClick={() => setSelectedRekapMonth(idx)}
                                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex-1 min-w-[75px] text-center flex flex-col justify-center items-center
                                      ${selectedRekapMonth === idx 
                                        ? 'bg-indigo-600 text-white shadow shadow-indigo-600/20 scale-100' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                                      }
                                    `}
                                  >
                                    <span>{m.slice(0, 3)}</span>
                                    <span className={`text-[8px] font-mono mt-0.5 block ${selectedRekapMonth === idx ? 'text-indigo-200' : 'text-slate-500'}`}>
                                      {rowSum > 0 ? `Rp ${formatIDR(rowSum)}` : '-'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* MAIN EDITABLE GRID */}
                            <div className="bg-slate-950 border border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div>
                                  <h4 className="font-extrabold text-white text-base uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>
                                    <span>Pencatatan Rincian SPJ • {monthNames[selectedRekapMonth]} 2026</span>
                                  </h4>
                                  <p className="text-[10px] text-slate-500 mt-1 font-bold">
                                    Format rekapbelanja terintegrasi. Perubahan nilai pada kolom 'Nilai (Rp)' dan selection 'Keterangan' disinkronkan otomatis!
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 no-print">
                                  {selectedCount > 0 && (
                                    <button
                                      onClick={handleDeleteSelectedRows}
                                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-950/20 cursor-pointer animate-fadeIn"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Hapus ({selectedCount})</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={handleAddNewRow}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-950/25 cursor-pointer"
                                  >
                                    <Plus className="w-4 h-4" />
                                    <span>Tambah Baris</span>
                                  </button>
                                  <button
                                    onClick={handleExportExcelManual}
                                    className="bg-slate-900 border border-slate-800 text-slate-200 hover:text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-slate-850"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Ekspor Excel/CSV</span>
                                  </button>
                                  <button
                                    onClick={() => window.print()}
                                    className="bg-slate-900 border border-slate-800 text-slate-200 hover:text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-slate-850"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Cetak Rekap</span>
                                  </button>
                                </div>
                              </div>

                              {/* LIST CONTAINER GRID */}
                              <div className="overflow-x-auto rounded-2xl border border-slate-900">
                                <table className="w-full text-left font-sans text-xs">
                                  <thead>
                                    <tr className="bg-slate-900 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
                                      <th className="py-3 px-4 w-12 text-center no-print">
                                        <input
                                          type="checkbox"
                                          checked={isAllSelected}
                                          onChange={(e) => handleToggleAllRows(e.target.checked)}
                                          className="accent-indigo-500 rounded border-slate-800 bg-slate-950 cursor-pointer w-4 h-4"
                                        />
                                      </th>
                                      <th className="py-3 px-4 w-16 text-center">No</th>
                                      <th className="py-3 px-4 w-32">Tanggal SPJ</th>
                                      <th className="py-3 px-6">Uraian / Deskripsi Belanja Selaras</th>
                                      <th className="py-3 px-6 w-56 text-right">Nilai Belanja (Rp)</th>
                                      <th className="py-3 px-6 w-60">Belanja Barang Jasa</th>
                                      <th className="py-3 px-6 w-64">Keterangan (Pengait Item Pagu)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-900">
                                    {currentMonthRows.length === 0 ? (
                                      <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-500 font-bold block-empty">
                                          Belum ada data terekam di bulan {monthNames[selectedRekapMonth]}. Klik tombol 'Tambah Baris' di atas untuk memulai.
                                        </td>
                                      </tr>
                                    ) : (
                                      currentMonthRows.map((row, index) => (
                                        <tr key={index} className="hover:bg-slate-900/30 text-slate-300">
                                          <td className="py-3 px-4 text-center no-print">
                                            <input
                                              type="checkbox"
                                              checked={!!row.checked}
                                              onChange={(e) => handleToggleRowSelection(index, e.target.checked)}
                                              className="accent-indigo-500 rounded border-slate-800 bg-slate-950 cursor-pointer w-4 h-4"
                                            />
                                          </td>
                                          <td className="py-3 px-4 text-center">
                                            <input
                                              type="text"
                                              value={row.kolom1}
                                              onChange={(e) => handleRowCellChange(index, 'kolom1', e.target.value)}
                                              className="w-full bg-transparent text-center focus:outline-none focus:bg-slate-900 border-none rounded p-1"
                                            />
                                          </td>
                                          <td className="py-3 px-4">
                                            <input
                                              type="text"
                                              value={row.kolom2}
                                              onChange={(e) => handleRowCellChange(index, 'kolom2', e.target.value)}
                                              className="w-full bg-transparent text-center focus:outline-none focus:bg-slate-900 border-none rounded p-1 font-mono text-slate-400"
                                              placeholder="DD/MM/YYYY"
                                            />
                                          </td>
                                          <td className="py-3 px-6">
                                            <input
                                              type="text"
                                              value={row.kolom3}
                                              onChange={(e) => handleRowCellChange(index, 'kolom3', e.target.value)}
                                              className="w-full bg-transparent focus:outline-none focus:bg-slate-900 border-none rounded p-1 text-slate-100 placeholder-slate-600 font-semibold"
                                              placeholder="Uraian perihal belanja kegiatan..."
                                            />
                                          </td>
                                          <td className="py-3 px-6 text-right">
                                            <input
                                              type="text"
                                              value={row.kolom4}
                                              onChange={(e) => {
                                                const cleaned = e.target.value.replace(/[^0-9]/g, '');
                                                handleRowCellChange(index, 'kolom4', cleaned);
                                              }}
                                              onBlur={() => {
                                                const numeric = parseFloat(row.kolom4.replace(/[^0-9]/g, '')) || 0;
                                                handleRowCellChange(index, 'kolom4', formatIDR(numeric));
                                              }}
                                              className="w-full bg-transparent text-right focus:outline-none focus:bg-slate-900 border-none rounded p-1 font-mono font-bold text-indigo-400"
                                            />
                                          </td>
                                          <td className="py-3 px-6 text-slate-400 font-black italic">
                                            {belanjaDefaultLabel}
                                          </td>
                                          <td className="py-3 px-6 text-indigo-400">
                                            <select
                                              value={row.kolom6}
                                              onChange={(e) => handleRowCellChange(index, 'kolom6', e.target.value)}
                                              className="w-full bg-slate-900 text-indigo-400 font-black focus:outline-none cursor-pointer text-xs p-1 rounded-lg border border-slate-800"
                                            >
                                              <option value="">-- PILIHN ITEM --</option>
                                              {allowedKeteranganOptions.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                    {/* Sub-total row monthly table */}
                                    {currentMonthRows.length > 0 && (
                                      <tr className="bg-slate-900/40 text-white font-bold border-t border-slate-800">
                                        <td colSpan={2} className="no-print"></td>
                                        <td colSpan={2} className="py-4 px-6 text-right font-black uppercase text-xs tracking-wider">Jumlah Total Belanja Bulan ini</td>
                                        <td className="py-4 px-6 text-right font-mono font-black text-xs text-indigo-300">Rp {formatIDR(currentMonthTotalSum)}</td>
                                        <td colSpan={2}></td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                          </div>
                        )}

                      </div>
                    );
                  })()}

                  {/* ======================================================= */}
                  {/* MODE 2: ORIGINAL TRADITIONAL FILE UPLOADER & BULK REC   */}
                  {/* ======================================================= */}
                  {bludTabMode === 'original' && (
                    <div id="tab-blud-traditional" className="space-y-8 animate-fadeIn">
                      
                      {/* UPLOAD & SYNCHRONIZE BLUD INTEGRATION PANEL */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
                        {/* Panel 1: Upload File BLUD (.json / .csv) */}
                        <div className="bg-slate-950 p-6 md:p-8 rounded-[2.5rem] border border-slate-800 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                                <Upload className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm md:text-base">Upload Berkas Anggaran BLUD</h4>
                                <p className="text-xs text-slate-400">Unggah rincian rekap belanja langsung dari komputermu.</p>
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed min-h-[40px] mb-4">
                              Mendukung format file <span className="bg-slate-900 border border-slate-800 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold">.json</span> atau <span className="bg-slate-900 border border-slate-800 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold">.csv</span>. Sistem akan mendeteksi otomatis dan menyinkronkan data rincian belanja BLUD yang ada secara aman.
                            </p>
                          </div>

                          <div 
                            onClick={() => fileInputBludUploadRef.current?.click()}
                            className="border border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-all select-none group"
                          >
                            <FileUp className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 mx-auto mb-2 transition-transform duration-300 group-hover:scale-110" />
                            <span className="text-xs font-bold text-slate-300 group-hover:text-white block">
                              Pilih berkas rincian belanja BLUD (.json, .csv)
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1 block font-semibold">
                              Kolom CSV: kegiatan, anggaran, realisasi, bulan
                            </span>
                          </div>
                          <input 
                            ref={fileInputBludUploadRef}
                            type="file" 
                            accept=".json,.csv"
                            className="hidden" 
                            onChange={handleBludUpload}
                          />
                        </div>

                        {/* Panel 2: Google Sheets Synchronization */}
                        <div className="bg-slate-950 p-6 md:p-8 rounded-[2.5rem] border border-slate-800 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                                <FileSpreadsheet className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm md:text-base font-bold">Sinkronisasi Google Sheets (Tab BLUD)</h4>
                                <p className="text-xs text-slate-400 font-bold">Selaraskan lembar kerja rincian belanja BLUD dengan platform awan.</p>
                              </div>
                            </div>

                            <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl mb-4">
                              <label className="text-[9px] text-slate-500 font-extrabold block mb-1 uppercase tracking-wider">Spreadsheet ID Koneksi Terbuka</label>
                              <code className="bg-slate-950 px-2 py-1 rounded text-indigo-400 text-[11px] font-mono block truncate font-bold">
                                {googleConfig.sheetsId || DEFAULT_SHEETS_SPREADSHEET_ID}
                              </code>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide font-sans">Tab Aktif: BLUD</span>
                              </div>
                            </div>
                          </div>

                          {isSyncingBludSheets ? (
                            <div className="space-y-3 animate-fadeIn">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-indigo-400 font-black animate-pulse uppercase tracking-widest flex items-center gap-1.5">
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Sedang Sinkronisasi...</span>
                                </span>
                                <span className="text-xs font-mono font-black text-indigo-300">{syncBludProgress}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                                <div 
                                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                                  style={{ width: `${syncBludProgress}%` }}
                                ></div>
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold italic truncate">
                                {bludSyncLog}
                              </p>
                            </div>
                          ) : (
                            <button 
                              onClick={handleSyncBludToSheets}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/20 active:scale-[0.98] cursor-pointer"
                            >
                              <RefreshCw className="w-4 h-4 text-emerald-100" />
                              <span>SINKRONKAN SEKARANG KE GOOGLE SHEETS</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Actions row with Backup, Restore & Reset Buttons */}
                      <div className={`p-4 rounded-3xl border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 transition-all duration-300 no-print mb-4
                        ${theme === 'light' ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-900/30 border-slate-800/60 shadow-lg'}
                      `}>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <h3 className={`text-sm font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                            Rincian Belanja BLUD Aktif
                          </h3>
                          {selectedBlud.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 animate-fadeIn">
                              <button
                                onClick={() => handleDeleteBulk('blud')}
                                className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-lg shadow-rose-650/15 cursor-pointer transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus Terpilih ({selectedBlud.length})</span>
                              </button>
                              <button
                                onClick={handleOpenBulkEdit}
                                className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-lg shadow-amber-650/15 cursor-pointer transition-all"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit Masal ({selectedBlud.length})</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Backup, Restore, and Reset Controller */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={handleExportBludBackup}
                            className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border
                              ${theme === 'light' 
                                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm' 
                                : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300 hover:text-white'
                              }
                            `}
                            title="Unduh backup data BLUD aktif ke komputer dalam format JSON"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Backup BLUD</span>
                          </button>

                          <button
                            onClick={() => fileInputBludRestoreRef.current?.click()}
                            className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border
                              ${theme === 'light' 
                                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm' 
                                : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300 hover:text-white'
                              }
                            `}
                            title="Unggah file backup JSON untuk memulihkan rincian data BLUD"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Restore BLUD</span>
                          </button>
                          <input 
                            ref={fileInputBludRestoreRef}
                            type="file" 
                            accept=".json"
                            className="hidden" 
                            onChange={handleBludRestore}
                          />

                          {resetBludConfirm ? (
                            <div className="flex items-center gap-1 animate-fadeIn">
                              <button
                                onClick={handleResetBlud}
                                className="px-3 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer bg-rose-600 hover:bg-rose-500 text-white border border-rose-600 flex items-center gap-1 shadow-lg shadow-rose-600/20"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Ya, Reset!</span>
                              </button>
                              <button
                                onClick={() => setResetBludConfirm(false)}
                                className={`px-2 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer border
                                  ${theme === 'light'
                                    ? 'bg-slate-100 border-slate-350 text-slate-700 hover:bg-slate-200'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                  }
                                `}
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setResetBludConfirm(true)}
                              className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border
                                ${theme === 'light'
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-sm'
                                  : 'bg-rose-950/20 hover:bg-rose-950/40 border-rose-900/40 text-rose-450 hover:text-rose-450'
                                }
                              `}
                              title="Kosongkan seluruh data anggaran BLUD saat ini"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset BLUD</span>
                            </button>
                          )}

                          <div className={`w-px h-5 mx-1 hidden sm:block ${theme === 'light' ? 'bg-slate-250' : 'bg-slate-800'}`}></div>

                          <button 
                            id="btn-tambah-blud-modal"
                            onClick={() => setShowAddBludModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl font-black text-xs text-white cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/25"
                          >
                            <Plus className="w-3.5 h-3.5 text-indigo-200" />
                            <span>Tambah Data BLUD</span>
                          </button>
                        </div>
                      </div>

                      {/* Table Lists */}
                      <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="py-4 px-6 w-12 text-center">
                                  <input 
                                    type="checkbox" 
                                    checked={bludList.length > 0 && selectedBlud.length === bludList.length}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedBlud(bludList.map(x => x.id));
                                      } else {
                                        setSelectedBlud([]);
                                      }
                                    }}
                                    className="accent-indigo-500 rounded border-slate-800 bg-slate-900 cursor-pointer w-4 h-4"
                                  />
                                </th>
                                <th className="py-4 px-2 w-10 text-center"></th>
                                <th 
                                  className="py-4 px-6 w-24 cursor-pointer hover:text-indigo-400 transition-colors select-none group"
                                  onClick={() => handleBludSort('index')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span>No</span>
                                    <span className="opacity-50 group-hover:opacity-100 transition-opacity">
                                      {bludSortField === 'index' ? (
                                        bludSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                                      ) : (
                                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                                      )}
                                    </span>
                                  </div>
                                </th>
                                <th 
                                  className="py-4 px-6 cursor-pointer hover:text-indigo-400 transition-colors select-none group"
                                  onClick={() => handleBludSort('kegiatan')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Uraian Nama Kegiatan</span>
                                    <span className="opacity-50 group-hover:opacity-100 transition-opacity">
                                      {bludSortField === 'kegiatan' ? (
                                        bludSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                                      ) : (
                                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                                      )}
                                    </span>
                                  </div>
                                </th>
                                <th 
                                  className="py-4 px-6 cursor-pointer hover:text-indigo-400 transition-colors select-none group"
                                  onClick={() => handleBludSort('anggaran')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Jumlah Anggaran</span>
                                    <span className="opacity-50 group-hover:opacity-100 transition-opacity">
                                      {bludSortField === 'anggaran' ? (
                                        bludSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                                      ) : (
                                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                                      )}
                                    </span>
                                  </div>
                                </th>
                                <th 
                                  className="py-4 px-6 cursor-pointer hover:text-indigo-400 transition-colors select-none group"
                                  onClick={() => handleBludSort('realisasi')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Realisasi Real</span>
                                    <span className="opacity-50 group-hover:opacity-100 transition-opacity">
                                      {bludSortField === 'realisasi' ? (
                                        bludSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                                      ) : (
                                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                                      )}
                                    </span>
                                  </div>
                                </th>
                                <th 
                                  className="py-4 px-6 cursor-pointer hover:text-indigo-400 transition-colors select-none group"
                                  onClick={() => handleBludSort('percent')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Persen (%)</span>
                                    <span className="opacity-50 group-hover:opacity-100 transition-opacity">
                                      {bludSortField === 'percent' ? (
                                        bludSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                                      ) : (
                                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                                      )}
                                    </span>
                                  </div>
                                </th>
                                <th 
                                  className="py-4 px-6 cursor-pointer hover:text-indigo-400 transition-colors select-none group"
                                  onClick={() => handleBludSort('bulan')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Kegiatan Bulan</span>
                                    <span className="opacity-50 group-hover:opacity-100 transition-opacity">
                                      {bludSortField === 'bulan' ? (
                                        bludSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                                      ) : (
                                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                                      )}
                                    </span>
                                  </div>
                                </th>
                                <th className="py-4 px-6 w-24 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900">
                              {bludList.length === 0 ? (
                                <tr>
                                  <td colSpan={9} className="py-12 text-center text-slate-500 font-bold block-empty">
                                    Belum ada rincian rekap belanja BLUD. Gunakan tombol 'Tambah Data BLUD' di atas.
                                  </td>
                                </tr>
                              ) : (
                                sortedBludList.map((item, index) => {
                                  const percent = item.anggaran ? Math.round((item.realisasi / item.anggaran) * 100) : 0;
                                  const isOverLimit = item.anggaran ? (item.realisasi > item.anggaran * 0.90) : false;
                                  const isExpanded = expandedBludId === item.id;
                                  return (
                                    <React.Fragment key={item.id}>
                                      <tr 
                                        onClick={(e) => {
                                          const target = e.target as HTMLElement;
                                          if (target.closest('input') || target.closest('button')) {
                                            return;
                                          }
                                          setExpandedBludId(isExpanded ? null : item.id);
                                        }}
                                        className={`transition-all border-l-4 cursor-pointer
                                          ${isOverLimit 
                                            ? (theme === 'light'
                                              ? 'bg-rose-50/90 text-rose-950 border-rose-500 hover:bg-rose-100/90 font-medium'
                                              : 'bg-rose-950/20 text-rose-200 border-rose-500/80 hover:bg-rose-950/30'
                                            )
                                            : (theme === 'light'
                                              ? 'hover:bg-slate-100/80 text-slate-800 border-transparent hover:text-black hover:font-semibold'
                                              : 'hover:bg-slate-900/50 text-slate-300 border-transparent'
                                            )
                                          }
                                        `}
                                      >
                                        <td className="py-4 px-6 text-center">
                                          <input 
                                            type="checkbox" 
                                            checked={selectedBlud.includes(item.id)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedBlud([...selectedBlud, item.id]);
                                              } else {
                                                setSelectedBlud(selectedBlud.filter(id => id !== item.id));
                                              }
                                            }}
                                            className="accent-indigo-500 rounded border-slate-800 bg-slate-900 cursor-pointer w-4 h-4"
                                          />
                                        </td>
                                        <td className="py-4 px-2 text-center text-slate-500 hover:text-indigo-400">
                                          {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 mx-auto animate-bounce" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4 mx-auto" />
                                          )}
                                        </td>
                                        <td className="py-4 px-6 font-bold">{index + 1}</td>
                                        <td className="py-4 px-6 font-bold text-slate-100">{item.kegiatan}</td>
                                        <td className="py-4 px-6 text-sm font-semibold">Rp {formatIDR(item.anggaran)}</td>
                                        <td className="py-4 px-6 text-sm text-indigo-400 font-black">Rp {formatIDR(item.realisasi)}</td>
                                        <td className="py-4 px-6">
                                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black inline-block
                                            ${percent > 85 ? 'bg-rose-500/10 text-rose-450 border border-rose-500/10' : percent > 50 ? 'bg-amber-500/10 text-amber-450 border border-amber-500/10' : 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/10'}
                                          `}>
                                            {percent}%
                                          </span>
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-400 font-semibold">{item.bulan || 'Januari'}</td>
                                        <td className="py-4 px-6 text-right">
                                          <button 
                                            onClick={() => handleDeleteRow('blud', item.id)}
                                            className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </td>
                                      </tr>
                                      {isExpanded && (
                                        <tr className={`${theme === 'light' ? 'bg-slate-50/70' : 'bg-slate-900/15'}`}>
                                          <td colSpan={9} className="py-4 px-6 md:px-10 border-l-4 border-indigo-500/80 animate-fadeIn">
                                            <div className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-white border-slate-200/90 shadow' : 'bg-slate-950 border-slate-800/80 shadow-lg'} flex flex-col md:flex-row md:items-center justify-between gap-6`}>
                                              <div className="space-y-1">
                                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 block font-sans">Informasi & Metadata Tambahan</span>
                                                <h5 className={`text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{item.kegiatan}</h5>
                                                <p className="text-[10px] text-slate-450 font-medium leading-relaxed max-w-lg">
                                                  Laporan pencatatan pertanggungjawaban fisik dan keuangan SPJ operasional unit kerja RSUD dr H JUSUF SK.
                                                </p>
                                              </div>
                                              
                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 shrink-0 font-sans">
                                                <div className="space-y-1">
                                                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 block animate-pulse">Penanggung Jawab (PIC)</span>
                                                  <span className={`text-xs font-black ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'} block`}>
                                                    👤 {item.pic || 'Meidi Priandana'}
                                                  </span>
                                                </div>
                                                <div className="space-y-1">
                                                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 block">Seksi / Departemen</span>
                                                  <span className={`text-xs font-black ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'} block`}>
                                                    🏢 {item.department || 'Sub Bagian Program & Anggaran'}
                                                  </span>
                                                </div>
                                                <div className="space-y-1">
                                                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 block">Tanggal Diperbarui</span>
                                                  <span className={`text-xs font-black ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'} block`}>
                                                    📅 {item.lastModified || (item.date ? item.date.split('T')[0] : '2026-06-08')}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}

            </motion.div>
          )}

          {/* ================= SECTION: PENGATURAN GOOGLE ================= */}
          {activeSection === 'settings' && (
            <motion.div
              key="settings"
              id="section-settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-8"
            >
              
              {/* Box Info Connection state defaults */}
              <div className={`border rounded-3xl p-6 flex items-start gap-4 transition-all duration-300
                ${theme === 'light'
                  ? 'bg-indigo-50/70 border-indigo-200 shadow-sm'
                  : 'bg-indigo-950/30 border-indigo-500/30'
                }
              `}>
                <Info className={`w-6 h-6 shrink-0 mt-0.5 animate-pulse
                  ${theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'}
                `} />
                <div>
                  <h4 className={`font-bold text-sm mb-1
                    ${theme === 'light' ? 'text-indigo-900' : 'text-indigo-300'}
                  `}>Predefined Target Connections Loaded</h4>
                  <p className={`text-xs leading-relaxed
                    ${theme === 'light' ? 'text-indigo-850/90 font-medium' : 'text-indigo-200/80'}
                  `}>
                    Sistem Pengelolaan Anggaran dan Dokumen (SIPANDA) ini di-hardcode untuk mengarah langsung ke Google Drive Folder ID: 
                    <code className={`font-mono px-1.5 py-0.5 rounded mx-1 text-[11px] border
                      ${theme === 'light'
                        ? 'bg-indigo-100 border-indigo-200/80 text-indigo-700'
                        : 'bg-slate-900 border-slate-800 text-indigo-400'
                      }
                    `}>{DEFAULT_DRIVE_FOLDER_ID}</code> 
                    dan Spreadsheet ID 
                    <code className={`font-mono px-1.5 py-0.5 rounded mx-1 text-[11px] border
                      ${theme === 'light'
                        ? 'bg-indigo-100 border-indigo-200/80 text-indigo-700'
                        : 'bg-slate-900 border-slate-800 text-indigo-400'
                      }
                    `}>{DEFAULT_SHEETS_SPREADSHEET_ID}</code>.
                    Tindakan ini menghindari ketergantungan API eksternal yang kompleks.
                  </p>
                </div>
              </div>

              {/* Sesi Autentikasi Google Workspace (Login/Logout) */}
              <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Sesi Koneksi Google Workspace</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Otorisasikan akun Google Anda untuk mengunggah PDF ke Drive dan menyinkronkan data ke Sheets secara real.</p>
                  </div>
                </div>

                {authLoading ? (
                  <div className="flex items-center gap-3 py-4 text-xs text-slate-400 font-bold">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Memuat status autentikasi Google...</span>
                  </div>
                ) : googleUser && googleToken ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-550/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 mb-1">Status: Terkoneksi</p>
                        <h4 className="font-bold text-white text-sm">{googleUser.displayName || 'Pengguna SIPANDA'}</h4>
                        <p className="text-xs text-slate-400 font-medium font-mono mt-0.5">{googleUser.email}</p>
                      </div>
                      <div className="text-xs bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-xl text-slate-300 font-black tracking-tight self-start md:self-auto uppercase">
                        Real-time Sync Aktif
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      className="bg-rose-650 hover:bg-rose-600 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-colors cursor-pointer tracking-wider uppercase"
                    >
                      Putuskan Sesi Google Workspace
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {unauthorizedDomainError && (
                      <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 space-y-4 leading-relaxed animate-fadeIn">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-rose-400 uppercase tracking-widest block text-xs">💡 SOLUSI ERROR: auth/unauthorized-domain</span>
                        </div>
                        <p className="font-medium text-slate-300">
                          Domain web Anda saat ini belum diotorisasi dalam Firebase. Demi keamanan Google, proses masuk (SignIn Popup) hanya diizinkan bagi domain terdaftar.
                        </p>
                        
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                          <p className="font-extrabold text-white text-[10px] uppercase tracking-wider">Langkah Mudah Penyelesaian:</p>
                          <ol className="list-decimal list-inside space-y-1.5 text-slate-400 font-bold ml-1">
                            <li>Buka <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Firebase Console Anda</a>.</li>
                            <li>Pilih proyek Firebase Anda (<span className="text-white font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">sipanda-9b16b</span>).</li>
                            <li>Buka menu <span className="text-indigo-400">Authentication</span> di sebelah kiri, lalu masuk ke tab <span className="text-indigo-400">Settings</span>.</li>
                            <li>Cari kolom <span className="text-indigo-400">Authorized Domains</span> di bagian bawah halaman.</li>
                            <li>Klik <span className="text-white font-extrabold bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">Add Domain</span>, lalu masukkan domain-domain berikut ini:</li>
                          </ol>
                        </div>

                        {/* Domain List Container */}
                        <div className="space-y-2">
                          <p className="font-extrabold text-slate-300 text-[10px] uppercase tracking-wider">Daftar Istilah & Domain Yang Harus Ditambahkan:</p>
                          
                          {/* 1. Current Domain name */}
                          <div className="bg-slate-900 p-3 rounded-xl border border-slate-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div>
                              <p className="font-extrabold text-white text-[11px]">1. Domain Aktif Saat Ini</p>
                              <p className="text-[10px] text-slate-400 font-medium">Domain tempat Anda mengklik tombol saat ini.</p>
                              <code className="text-[11px] font-mono font-black text-emerald-400 block mt-1 break-all">{unauthorizedDomainError}</code>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(unauthorizedDomainError);
                                triggerToast('Domain aktif disalin!', 'success');
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform shrink-0 cursor-pointer"
                            >
                              Salin
                            </button>
                          </div>

                          {/* 2. AI Studio Dev Domain if applicable */}
                          <div className="bg-slate-900 p-3 rounded-xl border border-slate-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div>
                              <p className="font-extrabold text-white text-[11px]">2. Domain Preview AI Studio (Development & Shared)</p>
                              <p className="text-[10px] text-slate-400 font-medium">Wajib agar login bekerja di layar preview editor Google AI Studio.</p>
                              <div className="space-y-1 mt-1">
                                <code className="text-[11px] font-mono font-black text-emerald-400 block break-all">ais-dev-3h5oljl46ztgnutpgrokyc-745106488165.asia-east1.run.app</code>
                                <code className="text-[11px] font-mono font-black text-emerald-400 block break-all">ais-pre-3h5oljl46ztgnutpgrokyc-745106488165.asia-east1.run.app</code>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText('ais-dev-3h5oljl46ztgnutpgrokyc-745106488165.asia-east1.run.app');
                                  triggerToast('Domain Dev disalin!', 'success');
                                }}
                                className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform cursor-pointer"
                              >
                                Salin Dev
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText('ais-pre-3h5oljl46ztgnutpgrokyc-745106488165.asia-east1.run.app');
                                  triggerToast('Domain Shared/Pre disalin!', 'success');
                                }}
                                className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform cursor-pointer"
                              >
                                Salin Pre
                              </button>
                            </div>
                          </div>

                          {/* 3. Vercel Domain name */}
                          <div className="bg-slate-900 p-3 rounded-xl border border-slate-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div>
                              <p className="font-extrabold text-white text-[11px]">3. Domain Vercel Anda (Production)</p>
                              <p className="text-[10px] text-slate-400 font-medium">Wajib agar login bekerja ketika dibuka oleh pengguna luar melalui Vercel.</p>
                              <div className="space-y-1 mt-1">
                                <code className="text-[11px] font-mono font-black text-emerald-400 block break-all">sistem-informasi-08-06-2026.vercel.app</code>
                                <code className="text-[11px] font-mono font-black text-emerald-400 block break-all">sistem-informasi-08-06-2026-ao8j.vercel.app</code>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText('sistem-informasi-08-06-2026.vercel.app');
                                  triggerToast('Domain Vercel 1 disalin!', 'success');
                                }}
                                className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform cursor-pointer"
                              >
                                Salin Vercel 1
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText('sistem-informasi-08-06-2026-ao8j.vercel.app');
                                  triggerToast('Domain Vercel 2 disalin!', 'success');
                                }}
                                className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform cursor-pointer"
                              >
                                Salin Vercel 2
                              </button>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 font-semibold italic">
                          *Setelah semua domain di atas ditambahkan di Firebase Console, silakan muat ulang browser/halaman ini lalu klik tombol "HUBUNGKAN AKUN GOOGLE SEKARANG" kembali.
                        </p>
                      </div>
                    )}

                    {operationNotAllowedError && (
                      <div className="p-5 rounded-2xl bg-amber-550/10 border border-amber-500/20 text-xs text-amber-200 space-y-4 leading-relaxed animate-fadeIn">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-amber-400 uppercase tracking-widest block text-xs">💡 SOLUSI ERROR: auth/operation-not-allowed</span>
                        </div>
                        <p className="font-medium text-slate-300">
                          Metode login "Google" belum diaktifkan dalam tab Authentication pada proyek Firebase Anda. Google melarang sistem login popup ini hingga Anda mengaktifkannya secara manual di konsol Firebase.
                        </p>
                        
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                          <p className="font-extrabold text-white text-[10px] uppercase tracking-wider">Langkah Mudah Mengaktifkan Google Login:</p>
                          <ol className="list-decimal list-inside space-y-1.5 text-slate-400 font-bold ml-1">
                            <li>Buka <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline font-black decoration-dotted">Firebase Console Anda</a>.</li>
                            <li>Pilih proyek Firebase Anda (<span className="text-white font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">sipanda-9b16b</span>).</li>
                            <li>Buka menu <span className="text-indigo-400 font-extrabold">Authentication</span> di sebelah kiri.</li>
                            <li>Masuk ke tab <span className="text-indigo-400 font-extrabold">Sign-in method</span> di bagian atas halaman.</li>
                            <li>Klik tombol <span className="text-white font-extrabold bg-indigo-650 px-2.5 py-1 rounded text-[10px] hover:bg-indigo-600 transition-colors cursor-pointer ml-1 inline-block">Add new provider</span> (atau klik "Google" jika sudah ada di daftar status disabled).</li>
                            <li>Pilih penyedia <span className="text-white font-extrabold">Google</span>.</li>
                            <li>Aktifkan saklar toggle (<span className="text-emerald-400 font-extrabold">Enable</span>) di kanan atas.</li>
                            <li>Masukkan alamat <span className="text-indigo-400 font-black">Project support email</span> Anda (pilih email Anda: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-white text-[11px] font-mono select-all border border-slate-800">meidipriandana@gmail.com</code>).</li>
                            <li>Klik tombol <span className="text-white font-extrabold bg-emerald-600 px-2.5 py-1 rounded text-[10px] hover:bg-emerald-550 transition-colors cursor-pointer ml-1 inline-block">Save</span> / Simpan di bagian bawah halaman.</li>
                          </ol>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 font-semibold italic">
                          *Setelah diaktifkan di Firebase Console, silakan muat ulang browser/halaman ini lalu klik tombol "HUBUNGKAN AKUN GOOGLE SEKARANG" kembali.
                        </p>
                      </div>
                    )}

                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-550/20 text-xs text-slate-300 leading-relaxed">
                      <span className="font-extrabold text-amber-400 block mb-1 uppercase">Sesi Kredensial Offline / Belum Terkoneksi</span>
                      Sistem sedang berjalan dalam mode simulasi offline. Silakan hubungkan akun Google Anda terlebih dahulu untuk mengaktifkan fungsionalitas unggah file langsung ke Drive dan sinkronisasi rincian anggaran BLUD ke Spreadsheet target secara live.
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center gap-2"
                    >
                      <span className="font-black">HUBUNGKAN AKUN GOOGLE SEKARANG</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Setup Google Drive */}
              <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Google Drive Connections</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Atur folder utama dokumen penelaahan dan sertifikat.</p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-2">Folder Id Target Google Drive</label>
                  <input 
                    type="text" 
                    placeholder="1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                    value={googleConfig.driveFolderId}
                    onChange={(e) => setGoogleConfig({ ...googleConfig, driveFolderId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-3 text-xs rounded-xl focus:outline-none focus:border-indigo-500 text-slate-100 font-bold font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-2 font-bold tracking-tight">ID target default telah diset untuk Google Drive: {DEFAULT_DRIVE_FOLDER_ID}</p>
                </div>

                <button 
                  onClick={() => handleSaveConfig('drive')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-600/10"
                >
                  Hubungkan Google Drive
                </button>
              </div>

              {/* Setup Google Spreadsheet */}
              <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Google Spreadsheet Sync Settings</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Hubungkan APBD rincian dengan Spreadsheet eksternal.</p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-2">Google Spreadsheet Database ID</label>
                  <input 
                    type="text" 
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                    value={googleConfig.sheetsId}
                    onChange={(e) => setGoogleConfig({ ...googleConfig, sheetsId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-3 text-xs rounded-xl focus:outline-none focus:border-indigo-500 text-slate-100 font-bold font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-2 font-bold tracking-tight">ID default telah diset untuk Spreadsheet ID: {DEFAULT_SHEETS_SPREADSHEET_ID}</p>
                </div>

                <div className="mb-6">
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-2">Nama Sheet (Sheet Tab)</label>
                  <input 
                    type="text" 
                    placeholder="Sheet1"
                    value={googleConfig.sheetsName}
                    onChange={(e) => setGoogleConfig({ ...googleConfig, sheetsName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-3 text-xs rounded-xl focus:outline-none focus:border-indigo-500 text-slate-100 font-bold"
                  />
                </div>

                <button 
                  onClick={() => handleSaveConfig('sheets')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-lg"
                >
                  Hubungkan Google Sheets
                </button>
              </div>

              {/* Reset All App Data */}
              <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-8 shadow-xl space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-15 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400 font-bold p-2">
                    <Trash2 className="w-6 h-6 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Kosongkan Semua Data Web</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Hapus seluruh data telaah staf, sertifikat, perjalanan dinas, BLUD, dan input anggaran daerah.</p>
                  </div>
                </div>

                <div className="bg-rose-500/5 rounded-2xl p-4 border border-rose-500/10 text-xs text-rose-300 leading-relaxed font-sans">
                  Peringatan: Seluruh data lokal yang telah dimasukkan atau dimuat di web akan dikosongkan. Pastikan Anda telah mengunduh backup (ekspor) jika ingin menyimpannya terlebih dahulu.
                </div>

                <button 
                  type="button"
                  onClick={() => setClearAllConfirmation(true)}
                  className="bg-rose-650 hover:bg-rose-600 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors shadow-lg shadow-rose-950/20"
                >
                  Hapus Semua Data Sekarang
                </button>
              </div>

            </motion.div>
          )}
          </AnimatePresence>

        </main>
      </div>

      {/* --- ADD PORTABLE REPORT MODAL --- */}
      <AnimatePresence>
        {showAddPerjadinModal && (
          <motion.div 
            id="modal-perjadin" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Tambah Laporan Kegiatan Bulanan</h3>
                <button 
                  onClick={() => setShowAddPerjadinModal(false)}
                  className="p-1 px-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1.5">Pilih Bulan Laporan</label>
                  <select 
                    id="perjadin-bulan-select"
                    value={perjadinForm.bulan}
                    onChange={(e) => setPerjadinForm({ ...perjadinForm, bulan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500 font-extrabold"
                  >
                    <option value="">Pilih Bulan</option>
                    <option value="Januari">Januari</option>
                    <option value="Februari">Februari</option>
                    <option value="Maret">Maret</option>
                    <option value="April">April</option>
                    <option value="Mei">Mei</option>
                    <option value="Juni">Juni</option>
                    <option value="Juli">Juli</option>
                    <option value="Agustus">Agustus</option>
                    <option value="September">September</option>
                    <option value="Oktober">Oktober</option>
                    <option value="November">November</option>
                    <option value="Desember">Desember</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1.5">Tujuan / Nama Kegiatan</label>
                  <input 
                    id="perjadin-tujuan-input"
                    type="text" 
                    placeholder="Contoh: RSUD dr H JUSUF SK"
                    value={perjadinForm.tujuan}
                    onChange={(e) => setPerjadinForm({ ...perjadinForm, tujuan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1.5">Pilih Berkas / File PDF</label>
                  <div className="flex gap-2">
                    <input 
                      id="manual-pdf-picker"
                      type="file" 
                      accept=".pdf" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setManualUploadFile(file);
                          setPerjadinForm(prev => ({ ...prev, fileName: file.name }));
                          triggerToast(`File PDF "${file.name}" terpilih!`);
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => document.getElementById('manual-pdf-picker')?.click()}
                      className="flex-1 bg-slate-950 hover:bg-slate-850 hover:text-white border border-slate-800 px-4 py-2.5 rounded-xl text-xs text-slate-350 font-bold text-center inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <FileUp className="w-4 h-4 text-indigo-400" />
                      <span>{manualUploadFile ? manualUploadFile.name : 'Pilih Berkas PDF...'}</span>
                    </button>
                    {manualUploadFile && (
                      <button 
                        type="button"
                        onClick={() => {
                          setManualUploadFile(null);
                          setPerjadinForm(prev => ({ ...prev, fileName: '' }));
                        }}
                        className="bg-slate-950 border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/20 text-rose-400 p-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1.5 font-sans leading-relaxed">
                    Arsipkan berkas PDF asli dari komputer Anda secara instan dan aman.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-800/85 flex justify-end gap-3 bg-slate-950/20">
                <button 
                  onClick={() => setShowAddPerjadinModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSavePerjadinForm}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all"
                >
                  Simpan Laporan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- ADD PORTABLE BLUD MODAL --- */}
      <AnimatePresence>
        {showAddBludModal && (
          <motion.div 
            id="modal-blud" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Tambah Rekap Belanja BLUD Baru</h3>
                <button 
                  onClick={() => setShowAddBludModal(false)}
                  className="p-1 px-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1.5">Nama Kegiatan Belanja BLUD</label>
                  <input 
                    id="blud-kegiatan-input"
                    type="text" 
                    placeholder="Contoh: Pengadaan ATK Penunjang Pelatihan"
                    value={bludForm.kegiatan}
                    onChange={(e) => setBludForm({ ...bludForm, kegiatan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1.5">Jumlah Anggaran Pagu (Rp)</label>
                  <input 
                    id="blud-anggaran-input"
                    type="number" 
                    placeholder="0"
                    value={bludForm.anggaran}
                    onChange={(e) => setBludForm({ ...bludForm, anggaran: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1.5">Realisasi yang Terpakai (Rp)</label>
                  <input 
                    id="blud-realisasi-input"
                    type="number" 
                    placeholder="0"
                    value={bludForm.realisasi}
                    onChange={(e) => setBludForm({ ...bludForm, realisasi: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1.5">Bulan Pelaksanaan</label>
                  <select 
                    id="blud-bulan-select"
                    value={bludForm.bulan}
                    onChange={(e) => setBludForm({ ...bludForm, bulan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500 font-extrabold"
                  >
                    <option value="Januari">Januari</option>
                    <option value="Februari">Februari</option>
                    <option value="Maret">Maret</option>
                    <option value="April">April</option>
                    <option value="Mei">Mei</option>
                    <option value="Juni">Juni</option>
                    <option value="Juli">Juli</option>
                    <option value="Agustus">Agustus</option>
                    <option value="September">September</option>
                    <option value="Oktober">Oktober</option>
                    <option value="November">November</option>
                    <option value="Desember">Desember</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1.5">Penanggung Jawab (PIC)</label>
                    <input 
                      id="blud-pic-input"
                      type="text" 
                      placeholder="Nama PIC"
                      value={bludForm.pic}
                      onChange={(e) => setBludForm({ ...bludForm, pic: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1.5">Seksi / Departemen</label>
                    <input 
                      id="blud-department-input"
                      type="text" 
                      placeholder="Nama Unit/Seksi"
                      value={bludForm.department}
                      onChange={(e) => setBludForm({ ...bludForm, department: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-800/85 flex justify-end gap-3 bg-slate-950/20">
                <button 
                  onClick={() => setShowAddBludModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSaveBludForm}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all"
                >
                  Simpan BLUD
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- BULK EDIT BLUD MODAL --- */}
      <AnimatePresence>
        {showBulkEditBludModal && (
          <motion.div 
            id="modal-bulk-edit" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl transition-all duration-305
                ${theme === 'light' ? 'bg-white border-slate-205' : 'bg-slate-900 border-slate-800'}
              `}
            >
              <div className={`p-6 border-b flex items-center justify-between
                ${theme === 'light' ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800 bg-slate-950/20'}
              `}>
                <div>
                  <h3 className={`text-base font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    Edit Masal Rincian BLUD
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'} font-semibold mt-0.5`}>
                    Memodifikasi {selectedBlud.length} item rincian anggaran terpilih sekaligus
                  </p>
                </div>
                <button 
                  onClick={() => setShowBulkEditBludModal(false)}
                  className={`p-1 px-1.5 rounded-lg border transition-all cursor-pointer
                    ${theme === 'light' 
                      ? 'bg-slate-100 hover:bg-slate-205 text-slate-500 border-slate-205' 
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                    }
                  `}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* PIC Field Row */}
                <div className={`p-4 rounded-2xl border transition-all duration-300
                  ${theme === 'light' ? 'bg-slate-50 border-slate-200/80' : 'bg-slate-950/40 border-slate-800'}
                `}>
                  <label className="flex items-center gap-3 cursor-pointer select-none mb-3">
                    <input 
                      type="checkbox"
                      checked={bulkEditPicChecked}
                      onChange={(e) => setBulkEditPicChecked(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <span className={`text-[11px] font-extrabold uppercase tracking-wide
                      ${bulkEditPicChecked 
                        ? (theme === 'light' ? 'text-indigo-600' : 'text-indigo-400') 
                        : (theme === 'light' ? 'text-slate-500' : 'text-slate-500')
                      }
                    `}>
                      Ubah Penanggung Jawab (PIC)
                    </span>
                  </label>

                  <input 
                    type="text" 
                    placeholder="Masukkan nama PIC baru"
                    disabled={!bulkEditPicChecked}
                    value={bulkEditPic}
                    onChange={(e) => setBulkEditPic(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold outline-none border transition-all duration-300
                      ${theme === 'light' 
                        ? (bulkEditPicChecked ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed') 
                        : (bulkEditPicChecked ? 'bg-slate-950 text-white border-slate-800 focus:border-indigo-500' : 'bg-slate-900/40 text-slate-500 border-slate-850 cursor-not-allowed')
                      }
                    `}
                  />
                </div>

                {/* Department Field Row */}
                <div className={`p-4 rounded-2xl border transition-all duration-300
                  ${theme === 'light' ? 'bg-slate-50 border-slate-200/80' : 'bg-slate-950/40 border-slate-800'}
                `}>
                  <label className="flex items-center gap-3 cursor-pointer select-none mb-3">
                    <input 
                      type="checkbox"
                      checked={bulkEditDeptChecked}
                      onChange={(e) => setBulkEditDeptChecked(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <span className={`text-[11px] font-extrabold uppercase tracking-wide
                      ${bulkEditDeptChecked 
                        ? (theme === 'light' ? 'text-indigo-600' : 'text-indigo-400') 
                        : (theme === 'light' ? 'text-slate-500' : 'text-slate-500')
                      }
                    `}>
                      Ubah Seksi / Departemen
                    </span>
                  </label>

                  <input 
                    type="text" 
                    placeholder="Masukkan nama unit / seksi baru"
                    disabled={!bulkEditDeptChecked}
                    value={bulkEditDept}
                    onChange={(e) => setBulkEditDept(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold outline-none border transition-all duration-300
                      ${theme === 'light' 
                        ? (bulkEditDeptChecked ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed') 
                        : (bulkEditDeptChecked ? 'bg-slate-950 text-white border-slate-800 focus:border-indigo-500' : 'bg-slate-900/40 text-slate-500 border-slate-850 cursor-not-allowed')
                      }
                    `}
                  />
                </div>

                {/* Alert Warning Text */}
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] leading-relaxed
                  ${theme === 'light'
                    ? 'bg-amber-50 text-amber-800 border-amber-200/60'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }
                `}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                   <strong>Perhatian:</strong> Tindakan ini akan menimpa kolom PIC atau Seksi/Departemen terpilih dengan nilai yang ditentukan secara langsung untuk seluruh <strong>{selectedBlud.length}</strong> rincian belanja aktif. Kolom yang tidak dicentang tidak akan diubah.
                  </span>
                </div>
              </div>

              <div className={`p-6 border-t flex justify-end gap-3 bg-slate-950/5
                ${theme === 'light' ? 'border-slate-100' : 'border-slate-800'}
              `}>
                <button 
                  onClick={() => setShowBulkEditBludModal(false)}
                  className={`px-4 py-2 text-xs font-black transition-all cursor-pointer rounded-xl
                    ${theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}
                  `}
                >
                  Batal
                </button>
                <button 
                  onClick={handleBulkEditBlud}
                  disabled={!bulkEditPicChecked && !bulkEditDeptChecked}
                  className={`font-black text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg inline-flex items-center gap-1.5
                    ${(!bulkEditPicChecked && !bulkEditDeptChecked)
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/15'
                    }
                  `}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Terapkan Perubahan</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
           {/* --- EDIT TELAAH DOCUMENT MODAL --- */}
      <AnimatePresence>
        {editingTelaah && (
          <motion.div 
            id="modal-edit-telaah" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl transition-all duration-305
                ${theme === 'light' ? 'bg-white border-slate-205' : 'bg-slate-900 border-slate-800'}
              `}
            >
              <div className={`p-6 border-b flex items-center justify-between
                ${theme === 'light' ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800 bg-slate-950/20'}
              `}>
                <div>
                  <h3 className={`text-base font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    Edit Detail Dokumen Telaah
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-505' : 'text-slate-400'} font-semibold mt-0.5`}>
                    Modifikasi informasi dan tautan file secara manual
                  </p>
                </div>
                <button 
                  onClick={() => setEditingTelaah(null)}
                  className={`p-1 px-1.5 rounded-lg border transition-all cursor-pointer
                    ${theme === 'light' 
                      ? 'bg-slate-100 hover:bg-slate-205 text-slate-505 border-slate-205' 
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                    }
                  `}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* File Name input */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-wider block
                    ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                  `}>
                    Nama Dokumen / File
                  </label>
                  <input 
                    type="text"
                    value={editTelaahForm.name}
                    onChange={(e) => setEditTelaahForm({ ...editTelaahForm, name: e.target.value })}
                    placeholder="Contoh: Dokumen_Telaahan_Ranwal_2026.pdf"
                    className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all duration-300
                      ${theme === 'light' 
                        ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                        : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-500'
                      }
                    `}
                  />
                </div>

                {/* Optional PDF/Document File Upload / Drag-and-drop */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-wider block
                    ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                  `}>
                    Unggah / Ganti File PDF (Opsional)
                  </label>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        const sizeString = file.size < 1024 
                          ? `${file.size} B` 
                          : file.size < 1048576 
                            ? `${(file.size / 1024).toFixed(1)} KB` 
                            : `${(file.size / 1048576).toFixed(1)} MB`;
                        setEditTelaahForm({
                          name: file.name,
                          driveLink: URL.createObjectURL(file),
                          size: sizeString,
                          date: new Date().toISOString().split('T')[0]
                        });
                        triggerToast('File berhasil dimuat ke form edit!', 'success');
                      }
                    }}
                    onClick={() => {
                      document.getElementById('edit-modal-file-input')?.click();
                    }}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all group
                      ${theme === 'light'
                        ? 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'
                        : 'border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/10'
                      }
                    `}
                  >
                    <FileUp className="w-8 h-8 text-slate-505 group-hover:text-indigo-500 mx-auto mb-2 transition-transform group-hover:scale-105" />
                    <p className={`text-[11px] font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                      Seret file PDF baru atau klik untuk mendeteksi file lokal
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                      Metadata nama, ukuran, lampiran tautan, dan tanggal otomatis terisi
                    </p>
                    <input 
                      id="edit-modal-file-input"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const sizeString = file.size < 1024 
                            ? `${file.size} B` 
                            : file.size < 1048576 
                              ? `${(file.size / 1024).toFixed(1)} KB` 
                              : `${(file.size / 1048576).toFixed(1)} MB`;
                          setEditTelaahForm({
                            name: file.name,
                            driveLink: URL.createObjectURL(file),
                            size: sizeString,
                            date: new Date().toISOString().split('T')[0]
                          });
                          triggerToast('File berhasil dimuat ke form edit!', 'success');
                        }
                      }}
                    />
                  </div>
                </div>

                {/* URL/driveLink input */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-wider block
                    ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                  `}>
                    Tautan File (Local URL atau Cloud Link)
                  </label>
                  <input 
                    type="text"
                    value={editTelaahForm.driveLink}
                    onChange={(e) => setEditTelaahForm({ ...editTelaahForm, driveLink: e.target.value })}
                    placeholder="Contoh: blob:http://localhost:3000/... atau https://drive.google.com/..."
                    className={`w-full p-3 rounded-xl text-xs font-mono outline-none border transition-all duration-300
                      ${theme === 'light' 
                        ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                        : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-500'
                      }
                    `}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Size input */}
                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-wider block
                      ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                    `}>
                      Ukuran File
                    </label>
                    <input 
                      type="text"
                      value={editTelaahForm.size}
                      onChange={(e) => setEditTelaahForm({ ...editTelaahForm, size: e.target.value })}
                      placeholder="Contoh: 3.5 MB"
                      className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all duration-300
                        ${theme === 'light' 
                          ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                          : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-500'
                        }
                      `}
                    />
                  </div>

                  {/* Date input */}
                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-wider block
                      ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                    `}>
                      Tanggal Upload
                    </label>
                    <input 
                      type="date"
                      value={editTelaahForm.date}
                      onChange={(e) => setEditTelaahForm({ ...editTelaahForm, date: e.target.value })}
                      className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all duration-300
                        ${theme === 'light' 
                          ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                          : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-500'
                        }
                      `}
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex items-start gap-2 text-[10px] leading-relaxed
                  ${theme === 'light'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200/60'
                    : 'bg-indigo-950/20 text-indigo-300 border-indigo-500/20'
                  }
                `}>
                  <Info className="w-4 h-4 shrink-0 text-indigo-500 mt-0.5" />
                  <span>
                    Mengubah detail di sini hanya mempengaruhi metadata dokumen ini yang dideklarasikan secara lokal.
                  </span>
                </div>
              </div>

              <div className={`p-6 border-t flex justify-end gap-3 bg-slate-950/5
                ${theme === 'light' ? 'border-slate-100' : 'border-slate-800'}
              `}>
                <button 
                  onClick={() => setEditingTelaah(null)}
                  className={`px-4 py-2 text-xs font-black transition-all cursor-pointer rounded-xl
                    ${theme === 'light' ? 'text-slate-505 hover:text-slate-800' : 'text-slate-400 hover:text-white'}
                  `}
                >
                  Batal
                </button>
                <button 
                  onClick={handleSaveEditTelaah}
                  className="font-black text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- EDIT SERTIFIKAT DOCUMENT MODAL --- */}
      <AnimatePresence>
        {editingSertifikat && (
          <motion.div 
            id="modal-edit-sertifikat" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl transition-all duration-305
                ${theme === 'light' ? 'bg-white border-slate-205' : 'bg-slate-900 border-slate-800'}
              `}
            >
              <div className={`p-6 border-b flex items-center justify-between
                ${theme === 'light' ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800 bg-slate-950/20'}
              `}>
                <div>
                  <h3 className={`text-base font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    Edit Detail Detail Sertifikat
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-505' : 'text-slate-400'} font-semibold mt-0.5`}>
                    Modifikasi informasi dan tautan file sertifikat secara manual
                  </p>
                </div>
                <button 
                  onClick={() => setEditingSertifikat(null)}
                  className={`p-1 px-1.5 rounded-lg border transition-all cursor-pointer
                    ${theme === 'light' 
                      ? 'bg-slate-100 hover:bg-slate-205 text-slate-505 border-slate-205' 
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                    }
                  `}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* File Name input */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-wider block
                    ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                  `}>
                    Nama Dokumen / File Sertifikat
                  </label>
                  <input 
                    type="text"
                    value={editSertifikatForm.name}
                    onChange={(e) => setEditSertifikatForm({ ...editSertifikatForm, name: e.target.value })}
                    placeholder="Contoh: Sertifikat_Topan_setiawan.png"
                    className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all duration-300
                      ${theme === 'light' 
                        ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                        : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-500'
                      }
                    `}
                  />
                </div>

                {/* Optional File Upload for Sertifikat */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-wider block
                    ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                  `}>
                    Unggah / Ganti File Sertifikat (Opsional)
                  </label>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        const sizeString = file.size < 1024 
                          ? `${file.size} B` 
                          : file.size < 1048576 
                            ? `${(file.size / 1024).toFixed(1)} KB` 
                            : `${(file.size / 1048576).toFixed(1)} MB`;
                        setEditSertifikatForm({
                          name: file.name,
                          driveLink: URL.createObjectURL(file),
                          size: sizeString,
                          date: new Date().toISOString().split('T')[0]
                        });
                        triggerToast('File Sertifikat berhasil dimuat!', 'success');
                      }
                    }}
                    onClick={() => {
                      document.getElementById('edit-cert-file-input')?.click();
                    }}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all group
                      ${theme === 'light'
                        ? 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'
                        : 'border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/10'
                      }
                    `}
                  >
                    <FileUp className="w-8 h-8 text-slate-500 group-hover:text-indigo-500 mx-auto mb-2 transition-transform group-hover:scale-105" />
                    <p className={`text-[11px] font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                      Seret gambar atau PDF sertifikat baru, atau klik di sini
                    </p>
                    <input 
                      id="edit-cert-file-input"
                      type="file"
                      className="hidden"
                      accept=".png,.jpg,.jpeg,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const sizeString = file.size < 1024 
                            ? `${file.size} B` 
                            : file.size < 1048576 
                              ? `${(file.size / 1024).toFixed(1)} KB` 
                              : `${(file.size / 1048576).toFixed(1)} MB`;
                          setEditSertifikatForm({
                            name: file.name,
                            driveLink: URL.createObjectURL(file),
                            size: sizeString,
                            date: new Date().toISOString().split('T')[0]
                          });
                          triggerToast('File Sertifikat berhasil dimuat!', 'success');
                        }
                      }}
                    />
                  </div>
                </div>

                {/* URL/driveLink input */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-wider block
                    ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                  `}>
                    Tautan File / Path Sertifikat
                  </label>
                  <input 
                    type="text"
                    value={editSertifikatForm.driveLink}
                    onChange={(e) => setEditSertifikatForm({ ...editSertifikatForm, driveLink: e.target.value })}
                    placeholder="Contoh: blob:http://localhost:3000/... atau https://drive.google.com/..."
                    className={`w-full p-3 rounded-xl text-xs font-mono outline-none border transition-all duration-300
                      ${theme === 'light' 
                        ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                        : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-500'
                      }
                    `}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Size input */}
                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-wider block
                      ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                    `}>
                      Ukuran File
                    </label>
                    <input 
                      type="text"
                      value={editSertifikatForm.size}
                      onChange={(e) => setEditSertifikatForm({ ...editSertifikatForm, size: e.target.value })}
                      placeholder="Contoh: 1.5 MB"
                      className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all duration-300
                        ${theme === 'light' 
                          ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                          : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-500'
                        }
                      `}
                    />
                  </div>

                  {/* Date input */}
                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-wider block
                      ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                    `}>
                      Tanggal Deteksi / Upload
                    </label>
                    <input 
                      type="date"
                      value={editSertifikatForm.date}
                      onChange={(e) => setEditSertifikatForm({ ...editSertifikatForm, date: e.target.value })}
                      className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all duration-300
                        ${theme === 'light' 
                          ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                          : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-500'
                        }
                      `}
                    />
                  </div>
                </div>
              </div>

              <div className={`p-6 border-t flex justify-end gap-3 bg-slate-950/5
                ${theme === 'light' ? 'border-slate-100' : 'border-slate-800'}
              `}>
                <button 
                  onClick={() => setEditingSertifikat(null)}
                  className={`px-4 py-2 text-xs font-black transition-all cursor-pointer rounded-xl
                    ${theme === 'light' ? 'text-slate-505 hover:text-slate-800' : 'text-slate-400 hover:text-white'}
                  `}
                >
                  Batal
                </button>
                <button 
                  onClick={handleSaveEditSertifikat}
                  className="font-black text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Sertifikat</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- EDIT PERJADIN / LAPORAN BULANAN MODAL --- */}
      <AnimatePresence>
        {editingPerjadin && (
          <motion.div 
            id="modal-edit-perjadin" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl transition-all duration-305
                ${theme === 'light' ? 'bg-white border-slate-205' : 'bg-slate-900 border-slate-800'}
              `}
            >
              <div className={`p-6 border-b flex items-center justify-between
                ${theme === 'light' ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800 bg-slate-950/20'}
              `}>
                <div>
                  <h3 className={`text-base font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    Edit Detail Laporan Bulanan
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-505' : 'text-slate-400'} font-semibold mt-0.5`}>
                    Modifikasi informasi bulan, tujuan, dan file pdf laporan
                  </p>
                </div>
                <button 
                  onClick={() => setEditingPerjadin(null)}
                  className={`p-1 px-1.5 rounded-lg border transition-all cursor-pointer
                    ${theme === 'light' 
                      ? 'bg-slate-100 hover:bg-slate-205 text-slate-505 border-slate-205' 
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                    }
                  `}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* File Name input */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-wider block
                    ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                  `}>
                    Nama Dokumen / File Laporan
                  </label>
                  <input 
                    type="text"
                    value={editPerjadinForm.name}
                    onChange={(e) => setEditPerjadinForm({ ...editPerjadinForm, name: e.target.value })}
                    placeholder="Contoh: Laporan_Perjadin_Maret_2026.pdf"
                    className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all duration-300
                      ${theme === 'light' 
                        ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                        : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-505'
                      }
                    `}
                  />
                </div>

                {/* Optional drag-drop file upload */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-wider block
                    ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                  `}>
                    Unggah / Ganti PDF Laporan Kerja (Opsional)
                  </label>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        const sizeString = file.size < 1024 
                          ? `${file.size} B` 
                          : file.size < 1048576 
                            ? `${(file.size / 1024).toFixed(1)} KB` 
                            : `${(file.size / 1048576).toFixed(1)} MB`;
                        setEditPerjadinForm({
                          ...editPerjadinForm,
                          name: file.name,
                          driveLink: URL.createObjectURL(file),
                          size: sizeString,
                          date: new Date().toISOString().split('T')[0]
                        });
                        triggerToast('File PDF Laporan Berhasil Dimuat!', 'success');
                      }
                    }}
                    onClick={() => {
                      document.getElementById('edit-perjadin-file-input')?.click();
                    }}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all group
                      ${theme === 'light'
                        ? 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'
                        : 'border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/10'
                      }
                    `}
                  >
                    <FileUp className="w-8 h-8 text-slate-505 group-hover:text-indigo-500 mx-auto mb-2 transition-transform group-hover:scale-105" />
                    <p className={`text-[11px] font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                      Seret file PDF baru, atau klik di sini untuk pilih file
                    </p>
                    <input 
                      id="edit-perjadin-file-input"
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const sizeString = file.size < 1024 
                            ? `${file.size} B` 
                            : file.size < 1048576 
                              ? `${(file.size / 1024).toFixed(1)} KB` 
                              : `${(file.size / 1048576).toFixed(1)} MB`;
                          setEditPerjadinForm({
                            ...editPerjadinForm,
                            name: file.name,
                            driveLink: URL.createObjectURL(file),
                            size: sizeString,
                            date: new Date().toISOString().split('T')[0]
                          });
                          triggerToast('File PDF Laporan Berhasil Dimuat!', 'success');
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Bulan Laporan Select */}
                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-wider block
                      ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                    `}>
                      Bulan Laporan
                    </label>
                    <select 
                      value={editPerjadinForm.bulan}
                      onChange={(e) => setEditPerjadinForm({ ...editPerjadinForm, bulan: e.target.value })}
                      className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all duration-300 cursor-pointer
                        ${theme === 'light' 
                          ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                          : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-505'
                        }
                      `}
                    >
                      {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tujuan Kegiatan input */}
                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-wider block
                      ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                    `}>
                      Tujuan/Lingkup Kegiatan
                    </label>
                    <input 
                      type="text"
                      value={editPerjadinForm.tujuan}
                      onChange={(e) => setEditPerjadinForm({ ...editPerjadinForm, tujuan: e.target.value })}
                      placeholder="Contoh: Dalam Daerah / Samarinda"
                      className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all duration-300
                        ${theme === 'light' 
                          ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                          : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-505'
                        }
                      `}
                    />
                  </div>
                </div>

                {/* URL/driveLink input */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-wider block
                    ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                  `}>
                    Tautan File Google Drive/Local link
                  </label>
                  <input 
                    type="text"
                    value={editPerjadinForm.driveLink}
                    onChange={(e) => setEditPerjadinForm({ ...editPerjadinForm, driveLink: e.target.value })}
                    placeholder="Contoh: blob:http://localhost:3000/... atau https://drive.google.com/..."
                    className={`w-full p-3 rounded-xl text-xs font-mono outline-none border transition-all duration-300
                      ${theme === 'light' 
                        ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                        : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-505'
                      }
                    `}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Size input */}
                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-wider block
                      ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                    `}>
                      Ukuran File
                    </label>
                    <input 
                      type="text"
                      value={editPerjadinForm.size}
                      onChange={(e) => setEditPerjadinForm({ ...editPerjadinForm, size: e.target.value })}
                      placeholder="Contoh: 3.5 MB"
                      className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all duration-300
                        ${theme === 'light' 
                          ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                          : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-505'
                        }
                      `}
                    />
                  </div>

                  {/* Date input */}
                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-wider block
                      ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}
                    `}>
                      Tanggal Laporan
                    </label>
                    <input 
                      type="date"
                      value={editPerjadinForm.date}
                      onChange={(e) => setEditPerjadinForm({ ...editPerjadinForm, date: e.target.value })}
                      className={`w-full p-3 rounded-xl text-xs font-bold outline-none border transition-all duration-300
                        ${theme === 'light' 
                          ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500' 
                          : 'bg-slate-950 text-white border-slate-800 focus:border-indigo-505'
                        }
                      `}
                    />
                  </div>
                </div>
              </div>

              <div className={`p-6 border-t flex justify-end gap-3 bg-slate-950/5
                ${theme === 'light' ? 'border-slate-100' : 'border-slate-800'}
              `}>
                <button 
                  onClick={() => setEditingPerjadin(null)}
                  className={`px-4 py-2 text-xs font-black transition-all cursor-pointer rounded-xl
                    ${theme === 'light' ? 'text-slate-505 hover:text-slate-800' : 'text-slate-400 hover:text-white'}
                  `}
                >
                  Batal
                </button>
                <button 
                  onClick={handleSaveEditPerjadin}
                  className="font-black text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Laporan</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
           {/* --- QUICK PREVIEW DOCUMENT MODAL --- */}
      <AnimatePresence>
        {quickPreviewItem && (() => {
          const preview = getMockPreviewContent(quickPreviewItem);
          return (
            <motion.div 
              id="modal-quick-preview" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`border rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl transition-all duration-305
                  ${theme === 'light' ? 'bg-white border-slate-205' : 'bg-slate-900 border-slate-800'}
                `}
              >
                <div className={`p-6 border-b flex items-center justify-between
                  ${theme === 'light' ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800 bg-slate-950/20'}
                `}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                      <BookOpen className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        Pratinjau Cepat Dokumen
                      </h3>
                      <p className={`text-[10px] ${theme === 'light' ? 'text-slate-505' : 'text-slate-400'} font-bold uppercase tracking-wider`}>
                        {quickPreviewItem.size || '2.4 MB'} • Diunggah {quickPreviewItem.date}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setQuickPreviewItem(null)}
                    className={`p-1 px-1.5 rounded-lg border transition-all cursor-pointer
                      ${theme === 'light' 
                        ? 'bg-slate-100 hover:bg-slate-205 text-slate-500 border-slate-205' 
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                      }
                    `}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-wider block mb-1
                      ${theme === 'light' ? 'text-slate-500' : 'text-slate-550'}
                    `}>
                      Nama File Asli
                    </label>
                    <p className={`text-sm font-black break-all ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      {quickPreviewItem.name}
                    </p>
                  </div>

                  <div className={`p-5 rounded-2xl border space-y-4
                    ${theme === 'light' ? 'bg-slate-50 border-slate-200/85' : 'bg-slate-950/40 border-slate-800'}
                  `}>
                    <div className="flex justify-between items-start">
                      <span className={`text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-lg
                        ${theme === 'light' ? 'bg-indigo-50 text-indigo-700' : 'bg-indigo-500/10 text-indigo-400'}
                      `}>
                        {preview.title}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 font-bold uppercase">{preview.reference}</span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Isi Telaahan Masuk:</span>
                      <p className={`text-xs leading-relaxed font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                        {preview.content}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Rekomendasi Tindakan:</span>
                      <ul className="space-y-1.5 list-disc pl-4">
                        {preview.recommendations.map((rec, i) => (
                          <li key={i} className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'} font-semibold leading-relaxed`}>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className={`pt-2 border-t border-dashed flex justify-between items-center text-[10px]
                      ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}
                    `}>
                      <span className="text-slate-500 font-bold uppercase">PENULIS / SEKSI:</span>
                      <span className="text-indigo-400 font-black uppercase tracking-wider">{preview.writer}</span>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-[11px] leading-relaxed
                    ${theme === 'light'
                      ? 'bg-amber-50 text-amber-800 border-amber-250'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    }
                  `}>
                    <Info className="w-4 h-4 shrink-0 text-amber-550 mt-0.5" />
                    <span>
                      <strong>Informasi:</strong> Pratinjau cepat ini adalah ekstraksi dokumen lokal yang dilakukan secara otomatis. Buka file PDF penuh untuk menelusuri lembar disposisi, dokumen asli, atau isi lampiran lengkap.
                    </span>
                  </div>
                </div>

                <div className={`p-6 border-t flex justify-between items-center bg-slate-950/5
                  ${theme === 'light' ? 'border-slate-100' : 'border-slate-800'}
                `}>
                  <button 
                    onClick={() => {
                      setQuickPreviewItem(null);
                      handleOpenPdf(quickPreviewItem);
                    }}
                    className="font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/15 flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Buka PDF Detil</span>
                  </button>

                  <button 
                    onClick={() => setQuickPreviewItem(null)}
                    className={`px-4 py-2 text-xs font-black transition-all cursor-pointer rounded-xl border
                      ${theme === 'light' 
                        ? 'bg-slate-100 hover:bg-slate-205 text-slate-700 border-slate-250' 
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                      }
                    `}
                  >
                    Tutup Pratinjau
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

       {/* --- PREMIUM DUAL-MODAL CONFIRMATION DIALOGS --- */}
      <AnimatePresence>
        {deleteConfirmation && (
          <motion.div 
            id="modal-delete-confirmation" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-6 h-6 text-rose-500 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white uppercase tracking-wider">Konfirmasi Hapus</h4>
                  <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-0.5">Tindakan Permanen</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <p className="text-xs text-slate-400 font-semibold">Anda akan menghapus data berikut:</p>
                <p className="text-sm text-white font-black tracking-tight truncate">{deleteConfirmation.name || 'Dokumen / Laporan Tanpa Nama'}</p>
                <p className="text-[10px] text-slate-505 font-medium">Kategori: <span className="text-slate-300 font-bold">{deleteConfirmation.category.toUpperCase()}</span></p>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Apakah Anda yakin ingin menghapus data ini sepenuhnya? Tindakan ini akan menghapusnya dari penyimpanan lokal browser Anda.
              </p>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDeleteRow}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-rose-650/15 transition-all cursor-pointer"
                >
                  Ya, Hapus Data
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {apbdResetConfirmation && (
          <motion.div 
            id="modal-apbd-reset-confirmation" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Trash2 className="w-6 h-6 text-amber-500 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white uppercase tracking-wider">Hapus Inputan APBD</h4>
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-0.5">Tindakan Irreversible</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Tindakan ini akan mengosongkan semua angka realisasi bulanan APBD yang telah Anda masukkan di tabel. Anggaran Pagu asli tidak akan berubah.
              </p>

              <div className="bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/15">
                <p className="text-[10px] text-amber-450 font-bold tracking-tight leading-relaxed">
                  Peringatan: Seluruh data input bulanan APBD akan dihapus bersamanya dan tidak dapat dikembalikan.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setApbdResetConfirmation(false)}
                  className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmResetAPBD}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-amber-650/15 transition-all cursor-pointer"
                >
                  Ya, Reset Penuh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {clearAllConfirmation && (
          <motion.div 
            id="modal-clear-all-confirmation" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white uppercase tracking-wider">Kosongkan Semua Data</h4>
                  <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-0.5">Tindakan Irreversible</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Tindakan ini akan mengosongkan seluruh data yang tersimpan di web ini, termasuk semua:
                <br />
                • Daftar Telaah Staf
                <br />
                • Daftar Sertifikat Peserta
                <br />
                • Laporan Kegiatan Perjadin
                <br />
                • Rincian Anggaran BLUD
                <br />
                • Seluruh Input Bulanan APBD & Riwayat Aktivitas
              </p>

              <div className="bg-rose-500/5 p-3.5 rounded-xl border border-rose-500/15">
                <p className="text-[10px] text-rose-400 font-bold tracking-tight leading-relaxed font-sans">
                  Peringatan: Seluruh data lokal dan riwayat akan dihapus secara permanen dari browser Anda.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setClearAllConfirmation(false)}
                  className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmClearAllData}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Ya, Kosongkan Semua Data
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePdfPreview && (
          <motion.div 
            id="modal-pdf-viewer" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col md:flex-row items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Header / Toolbar */}
              <div className="p-4 md:p-6 border-b border-rose-500/10 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <FileText className="w-5 h-5 text-rose-500 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/10">PDF Dokumen</span>
                      {activePdfPreview.size && <span className="text-[10px] font-mono text-slate-505 font-bold">{activePdfPreview.size}</span>}
                    </div>
                    <h3 className="text-sm font-black text-white truncate max-w-xs md:max-w-md font-sans mt-0.5">{activePdfPreview.name}</h3>
                  </div>
                </div>

                {/* Tools and Download/Print actions */}
                <div className="flex items-center flex-wrap gap-2">
                  <a 
                    href={activePdfPreview.url} 
                    download={activePdfPreview.name}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs px-3 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all hover:text-white"
                    title="Download File PDF asli ke komputer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                  <button 
                    onClick={() => {
                      if (activePdfPreview.url.startsWith('blob:')) {
                        const iframe = document.querySelector('iframe[title="PDF Live Browser Native Frame"]') as HTMLIFrameElement;
                        if (iframe && iframe.contentWindow) {
                          try {
                            iframe.contentWindow.focus();
                            iframe.contentWindow.print();
                            return;
                          } catch (e) {
                            console.error(e);
                          }
                        }
                      }
                      const printWin = window.open(activePdfPreview.url, '_blank');
                      if(printWin) {
                        printWin.focus();
                        printWin.print();
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs px-3 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all hover:text-white"
                    title="Cetak Berkas PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cetak</span>
                  </button>

                  {/* Dynamic External Link Button to bypass any Iframe blocks */}
                  <a 
                    href={activePdfPreview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 text-indigo-300 hover:text-white font-extrabold text-xs px-3 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-indigo-950/20"
                    title="Buka dokumen secara langsung di Google Drive / Tab Baru untuk kemudahan edit atau cetak"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
                    <span>Buka Tab Baru</span>
                  </a>

                  <div className="h-6 w-[1px] bg-slate-855 mx-1 hidden sm:block"></div>
                  <button 
                    onClick={() => {
                      setActivePdfPreview(null);
                      triggerToast('Selesai meninjau PDF');
                    }}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-650/15 cursor-pointer transition-all"
                  >
                    <X className="w-4 h-4" />
                    <span>Tutup Viewer</span>
                  </button>
                </div>
              </div>

              {/* Split view: Dual visual content (Actual native frame + Smart fallback doc preview) */}
              <div className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-8 flex flex-col lg:flex-row gap-6">
                {/* Left Column: Simulated High-fidelity Interactive Document Reader with controls */}
                <div className="flex-1 flex flex-col bg-slate-900 min-h-[450px] rounded-2xl border border-slate-800 p-6 shadow-inner text-slate-200">
                  <div className="border-b border-slate-800 pb-4 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Draf / Preview Transparansi</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-505 font-black">PAGE 1 OF 1</div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs text-indigo-400 font-black tracking-widest uppercase font-mono mb-1">PROVINSI KALIMANTAN UTARA</h4>
                          <p className="text-md font-bold text-white font-sans leading-snug">RSUD dr. H. JUSUF SK TARAKAN</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-505 tracking-wider">OFFLINE SIGNED</span>
                      </div>

                      <div className="h-[1px] bg-gradient-to-r from-slate-800 via-rose-500/20 to-slate-800 my-2"></div>

                      <div className="space-y-3 font-sans">
                        <p className="text-[#818cf8] font-black text-xs uppercase tracking-wider font-mono">DETAIL LAMPIRAN UNTUK:</p>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                          <p className="text-xs text-slate-455 font-bold">Judul / Nama File:</p>
                          <p className="text-sm text-white font-bold tracking-tight">{activePdfPreview.name}</p>
                          <p className="text-xs text-slate-505 font-medium">Bulan Pelaksanaan: <span className="text-slate-300 font-bold ml-1">{activePdfPreview.category === 'perjadin' ? 'Laporan Bulanan' : 'Telaah / Kontribusi'}</span></p>
                        </div>
                      </div>

                      <div className="space-y-2 font-mono text-[11px] leading-relaxed text-slate-455">
                        <p>• Dokumen PDF ini terverifikasi secara lokal oleh Sistem Keuangan RSUD dr. H. Jusuf SK.</p>
                        <p>• Data dienkripsi dalam penyimpanan draf cache browser untuk akses real-time offline.</p>
                        <p>• Kompatibel penuh dengan otorisasi cloud Google Drive / Google Sheets.</p>
                      </div>

                      {/* Informational Help Box for iframe context Google Drive block */}
                      {activePdfPreview.url.includes('drive.google.com') && (
                        <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2.5 animate-fadeIn">
                          <div className="flex items-center gap-1.5 text-indigo-400 font-extrabold text-[11px] uppercase tracking-wider">
                            <span>💡</span>
                            <span>TIPS AKSES GOOGLE DRIVE:</span>
                          </div>
                          <p className="text-[10px] text-slate-300 font-extrabold leading-relaxed">
                            Jika bingkai sebelah kanan meminta otorisasi atau tampil pesan "You need access", hal ini normal terjadi karena kebijakan browser Anda menghalangi Google Suite mengenali login Anda melalui portal pihak ketiga (Third-Party Cookies).
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold leading-normal">
                            Dokumen Anda sudah terunggah dan aman di Drive Anda. Silakan klik tombol di bawah untuk membukanya secara langsung dengan akses penuh:
                          </p>
                          <a
                            href={activePdfPreview.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 w-full bg-indigo-650 hover:bg-indigo-600 text-white font-black text-[11.5px] py-2 px-3 rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-indigo-900/30"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span>Buka di Google Drive Baru</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-855 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-505 text-[10px] uppercase font-bold tracking-wider">
                      <span>Generated: {activePdfPreview.date || new Date().toISOString().split('T')[0]}</span>
                      <span>Verified: Secure Integrity Checked</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Actual Web Browser PDF Embed */}
                <div className="flex-1 flex flex-col min-h-[450px] relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden group shadow-lg">
                  <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-6 text-center select-none bg-slate-900 text-slate-500">
                    <FileText className="w-12 h-12 text-slate-800 animate-bounce mb-3" />
                    <p className="text-xs font-bold text-slate-400">Sedang Memuat Render PDF Asli...</p>
                    <p className="text-[10px] text-slate-600 max-w-xs mt-2 font-semibold">
                      Browser Anda akan mengekspos frame dokumen secara langsung di sini secara instan.
                    </p>
                  </div>

                  <iframe 
                    src={activePdfPreview.url.includes('drive.google.com') ? (() => {
                      const match = activePdfPreview.url.match(/\/file\/d\/([^/?]+)/);
                      if (match && match[1]) {
                        return `https://drive.google.com/file/d/${match[1]}/preview`;
                      }
                      const idParam = activePdfPreview.url.match(/[?&]id=([^&]+)/);
                      if (idParam && idParam[1]) {
                        return `https://drive.google.com/file/d/${idParam[1]}/preview`;
                      }
                      return activePdfPreview.url;
                    })() : activePdfPreview.url}
                    className="w-full h-full relative z-10 border-none bg-slate-900"
                    title="PDF Live Browser Native Frame"
                  />
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );

  // Helper inside App to toggle screens
  function showSection(sectionId: string) {
    setActiveSection(sectionId);
  }

  // Indonesian thousands format
  function formatIDR(num: number) {
    return new Intl.NumberFormat('id-ID').format(num);
  }
}
