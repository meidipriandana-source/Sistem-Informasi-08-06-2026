/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GDriveItem, PerjadinItem, BudgetDetailNode } from './types';

// Predefined Folder ID & Sheet ID as requested:
export const DEFAULT_DRIVE_FOLDER_ID = '1dUcuP_LownZK-q6Cd4ecg94T9ZggHGXX';
export const DEFAULT_SHEETS_SPREADSHEET_ID = '1T8QxUuWna4T-YV7wPiYQendHGhmAgy13tXlYRm7P1mw';

export const INITIAL_SER_NAMES = [
  "Abdul_Menan.png",
  "Sertifikat_Agung_walid_tri_atmaja.png",
  "Sertifikat_Agus_susanti.png",
  "Sertifikat_Alfriany_Ester_Hutahaean_SKM.png",
  "Sertifikat_Andi_Mayasari.png",
  "Sertifikat_Arsianti_Salawaty.png",
  "Sertifikat_Bujiadi.png",
  "Sertifikat_Deasy_Kartika_Anggraeni.png",
  "Sertifikat_Devita_Sari.png",
  "Sertifikat_Elisabeth_Toding.png",
  "Sertifikat_Fergi_Adriana.png",
  "Sertifikat_GALIH_SANSINO.png",
  "Sertifikat_GUNTUR_RAHNOMO.png",
  "Sertifikat_Harisma_Wijaya.png",
  "Sertifikat_Hidayat.png",
  "Sertifikat_Ibnu_rashad_jayusman.png",
  "Sertifikat_Indah_Sri_Mutiah_Lubis_SFtr.png",
  "Sertifikat_Iskah.png",
  "Sertifikat_Julie_safariani.png",
  "Sertifikat_Lala_Artika.png",
  "Sertifikat_Lutfi_ardiansyah.png",
  "Sertifikat_Meilisa_marin.png",
  "Sertifikat_Muhammad_Zulfikar_damas.png",
  "Sertifikat_Munandar.png",
  "Sertifikat_Musayitir.png",
  "Sertifikat_Nabila_Putri_Cahyani.png",
  "Sertifikat_Nasyah_Nuraulia.png",
  "Sertifikat_Nur_Afni_Adhayani.png",
  "Sertifikat_Nur_Uswatun_Hasanah.png",
  "Sertifikat_Nurlita_Gupita_Dewi.png",
  "Sertifikat_nurmalasari.png",
  "Sertifikat_Ramadani.png",
  "Sertifikat_Rinto_Pramono.png",
  "Sertifikat_Robby_awaluddin.png",
  "Sertifikat_Rofieatul_Azmi_Lopa.png",
  "Sertifikat_Rusilawati.png",
  "Sertifikat_Salim_J.png",
  "Sertifikat_Sherina_Nabila_Khanza.png",
  "Sertifikat_Siarah.png",
  "Sertifikat_Siti_aminah.png",
  "Sertifikat_Sudiono.png",
  "Sertifikat_Sulistioway.png",
  "Sertifikat_Sunarti.png",
  "Sertifikat_Suriati.png",
  "Sertifikat_Sutarno.png",
  "Sertifikat_Tri_Mulyani_S_A_P.png",
  "Sertifikat_Ufi_syafitri.png",
  "Sertifikat_Umi_Badriyah.png",
  "Sertifikat_WISNU_ADI_NUGRAHA.png",
  "Sertifikat_Yeisi_Gusniati.png",
  "Sertifikat_Yatmi.png",
  "Sertifikat_A_Zulisdiawati_Zulhairin.png",
  "Sertifikat_Abdul_habir_umar.png",
  "Sertifikat_Adi_julianto.png",
  "Sertifikat_AINUN_RUSHANI.png",
  "Sertifikat_Amariyah.png",
  "Sertifikat_Amiruddin.png",
  "Sertifikat_Amirul_Hayattul_Firdaus.png",
  "Sertifikat_Ari_Nursanti.png",
  "Sertifikat_Ariska_Purwasari.png",
  "Sertifikat_Carolina_Lembang_AMdFT.png",
  "Sertifikat_Dian_Rahmadani.png",
  "Sertifikat_EDI_PRIYANTOSH.png",
  "Sertifikat_Endah_Novita_Sari_SE.png",
  "Sertifikat_Erwin_SKM.png",
  "Sertifikat_Faesol_Puspito.png",
  "Sertifikat_Fanny_Putri_Kinasih.png",
  "Sertifikat_Iji_santoso.png",
  "Sertifikat_Irmawati_B_SKM.png",
  "Sertifikat_Jayanto.png",
  "Sertifikat_Khaidir_Nurdin_ST.png",
  "Sertifikat_Marianus_yoseph_mansyur_deyesus.png",
  "Sertifikat_Martinus_Amir.png",
  "Sertifikat_Merry_Shirley_marlina.png",
  "Sertifikat_Miswadi_Hadi_Saputro_STrRad.png",
  "Sertifikat_Muh_Adnan_Ismail_AMd.png",
  "Sertifikat_Muhadir.png",
  "Sertifikat_Muhammad_kadir.png",
  "Sertifikat_Mukti_Hasanal.png",
  "Sertifikat_Nanda_vreiza_marcella.png",
  "Sertifikat_Nur_Alus_Siregar_SIKom.png",
  "Sertifikat_Nur_janah.png",
  "Sertifikat_Nur_Kumala_Indah.png",
  "Sertifikat_Nurmirad_sakinah.png",
  "Sertifikat_Paundra_Spautra.png",
  "Sertifikat_Rezky_Nurul_Rahma_AMdKes.png",
  "Sertifikat_Rosdiana_Kawaru_STrKes.png",
  "Sertifikat_Rudy_Fardian.png",
  "Sertifikat_Sandy_Randawijaya.png",
  "Sertifikat_Selpiani.png",
  "Sertifikat_Sri_Wahyuni.png",
  "Sertifikat_St_Hasniah.png",
  "Sertifikat_SusantiSKM.png",
  "Sertifikat_Tiara_Mega_Pertiwi.png",
  "Sertifikat_Tirto_Adhi_Triambodo_SKom.png",
  "Sertifikat_Topan_setiawan.png",
  "Sertifikat_Willyansyah_SE.png",
  "Sertifikat_Wirdha_Amalia.png"
];

export const initialSertifikat = (): GDriveItem[] => {
  return INITIAL_SER_NAMES.map((name, i) => ({
    id: `preload-ser-${i}`,
    name,
    size: name.includes("Yatmi") || name.includes("A_Zu") ? "6.7 MB" : "6.6 MB",
    date: "2026-06-08",
    driveLink: `https://drive.google.com/drive/folders/${DEFAULT_DRIVE_FOLDER_ID}`,
    category: 'sertifikat'
  }));
};

export const initialPerjadin = (): PerjadinItem[] => {
  const gell = [3, 4, 5, 1, 2];
  return gell.map((num, i) => ({
    id: `preload-perj-${i}`,
    name: `BHD Gelombang ${num}.pdf`,
    size: "1.2 MB",
    date: "2026-06-08",
    driveLink: `https://drive.google.com/drive/folders/${DEFAULT_DRIVE_FOLDER_ID}`,
    bulan: num === 1 ? "Januari" : num === 2 ? "Februari" : num === 3 ? "Maret" : num === 4 ? "April" : "Mei",
    tujuan: "RSUD dr H JUSUF SK",
    category: 'perjadin'
  }));
};

export const budgetData: BudgetDetailNode[] = [
  {
    code: "5",
    name: "BELANJA DAERAH",
    budget: 2093974768,
    level: 0,
    children: [
      {
        code: "5.1",
        name: "BELANJA OPERASI",
        budget: 2093974768,
        level: 0,
        children: [
          {
            code: "5.1.02",
            name: "Belanja Barang dan Jasa",
            budget: 2093974768,
            level: 0,
            children: [
              {
                code: "5.1.02.01",
                name: "Belanja Barang",
                budget: 339774768,
                level: 0,
                children: [
                  {
                    code: "5.1.02.01.001",
                    name: "Belanja Barang Pakai Habis",
                    budget: 339774768,
                    level: 0,
                    children: [
                      {
                        code: "5.1.02.01.001.00026",
                        name: "Bahan Cetak",
                        budget: 30024768,
                        level: 0,
                        children: [
                          {
                            code: "",
                            name: "Sertifikat Peserta Pelatihan Assessor (150 Paket @ Rp200.000)",
                            budget: 30000000,
                            level: 1
                          },
                          {
                            code: "",
                            name: "Pengadaan Dokumen/Fotokopi (43 Lembar @ Rp576)",
                            budget: 24768,
                            level: 1
                          }
                        ]
                      },
                      {
                        code: "5.1.02.01.001.00035",
                        name: "Souvenir/Cendera Mata",
                        budget: 6200000,
                        level: 0,
                        children: [
                          {
                            code: "",
                            name: "Plakat Kayu + Logam Kuningan (5 Buah @ Rp1.240.000)",
                            budget: 6200000,
                            level: 1
                          }
                        ]
                      },
                      {
                        code: "5.1.02.01.001.00052",
                        name: "Makanan dan Minuman Rapat",
                        budget: 303550000,
                        level: 0,
                        children: [
                          {
                            code: "",
                            name: "Nasi Kotak Biasa (2.082 Porsi @ Rp60.000)",
                            budget: 124920000,
                            level: 1
                          },
                          {
                            code: "",
                            name: "Nasi Kotak Akreditasi (2.623 Porsi @ Rp60.000)",
                            budget: 157380000,
                            level: 1
                          },
                          {
                            code: "",
                            name: "Prasmanan VIP (250 Orang @ Rp85.000)",
                            budget: 21250000,
                            level: 1
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                code: "5.1.02.02",
                name: "Belanja Jasa",
                budget: 884200000,
                level: 0,
                children: [
                  {
                    code: "5.1.02.02.001",
                    name: "Belanja Jasa Kantor",
                    budget: 244200000,
                    level: 0,
                    children: [
                      {
                        code: "5.1.02.02.001.00011",
                        name: "Honorarium Pendidikan dan Pelatihan",
                        budget: 229200000,
                        level: 0,
                        children: [
                          {
                            code: "",
                            name: "Honorarium Pengajar Luar Daerah (764 Jam @ Rp300.000)",
                            budget: 229200000,
                            level: 1
                          }
                        ]
                      },
                      {
                        code: "5.1.02.02.001.00055",
                        name: "Jasa Iklan/Reklame/Film",
                        budget: 15000000,
                        level: 0,
                        children: [
                          {
                            code: "",
                            name: "Jasa Iklan Media Cetak (10 Paket @ Rp1.500.000)",
                            budget: 15000000,
                            level: 1
                          }
                        ]
                      }
                    ]
                  },
                  {
                    code: "5.1.02.02.012",
                    name: "Belanja Kursus/Pelatihan",
                    budget: 640000000,
                    level: 0,
                    children: [
                      {
                        code: "",
                        name: "Kontribusi Tenaga Medis/Keperawatan/Penunjang (50 Org @ Rp10.000.000)",
                        budget: 500000000,
                        level: 1
                      },
                      {
                        code: "",
                        name: "Kontribusi Tenaga Medis/Penunjang/ATCLS (5 Org @ Rp10.000.000)",
                        budget: 50000000,
                        level: 1
                      },
                      {
                        code: "",
                        name: "Kontribusi Surveyor/Pendampingan Akreditasi",
                        budget: 90000000,
                        level: 1,
                        children: [
                          {
                            code: "",
                            name: "Kontribusi Surveyor Kegiatan 1",
                            budget: 20000000,
                            level: 2
                          },
                          {
                            code: "",
                            name: "Kontribusi Surveyor Kegiatan 2",
                            budget: 40000000,
                            level: 2
                          },
                          {
                            code: "",
                            name: "Kontribusi Surveyor Kegiatan 3",
                            budget: 30000000,
                            level: 2
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                code: "5.1.02.04",
                name: "Belanja Perjalanan Dinas",
                budget: 870000000,
                level: 0,
                children: [
                  {
                    code: "5.1.02.04.001",
                    name: "Perjalanan Dinas Dalam Negeri",
                    budget: 870000000,
                    level: 0,
                    children: [
                      {
                        code: "",
                        name: "Perjalanan Dinas Tenaga Medis/Penunjang/Manajemen",
                        budget: 820000000,
                        level: 1,
                        children: [
                          {
                            code: "",
                            name: "Perjalanan Dinas (6 Orang @ Rp10.000.000)",
                            budget: 60000000,
                            level: 2
                          },
                          {
                            code: "",
                            name: "Perjalanan Dinas (76 Orang @ Rp10.000.000)",
                            budget: 760000000,
                            level: 2
                          }
                        ]
                      },
                      {
                        code: "",
                        name: "Perjalanan Dinas Surveyor (5 Paket @ Rp10.000.000)",
                        budget: 50000000,
                        level: 1
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];
