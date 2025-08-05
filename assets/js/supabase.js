// assets/js/supabase.js

// 1. IMPOR PUSTAKA SUPABASE
// Mengimpor fungsi createClient dari pustaka Supabase.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 2. KONFIGURASI SUPABASE
// Ganti dengan URL dan Kunci Anon (Public) proyek Supabase Anda.
// Anda bisa menemukannya di Pengaturan Proyek > API di dashboard Supabase Anda.
const supabaseUrl = 'https://xfxwpzcwlbrumklkkbfq.supabase.co'; // Ganti dengan URL Anda
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmeHdwemN3bGJydW1rbGtrYmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNTM2NzYsImV4cCI6MjA2OTkyOTY3Nn0.I-A1Ie96MeE9P2Nfgy-RhMLVzq2dJ36tdIBsHruEGxg'; // Ganti dengan Kunci Anon Anda

// 3. INISIALISASI KLIEN SUPABASE
// Membuat dan mengekspor satu instance klien Supabase yang akan digunakan di seluruh aplikasi.
// Ini memastikan kita tidak perlu mengkonfigurasi ulang di setiap file.
export const supabase = createClient(supabaseUrl, supabaseKey);
