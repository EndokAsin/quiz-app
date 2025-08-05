// assets/js/app.js (Revisi Esai & Penilaian)

import { supabase } from './supabase.js';

// ===================================================================================
// FUNGSI UTILITAS
// ===================================================================================
const showError = (message, elementId = 'error-message') => {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) errorDiv.textContent = message;
    console.error(message);
};

const showSuccess = (message, elementId = 'success-message') => {
    const successDiv = document.getElementById(elementId);
    if (successDiv) {
        successDiv.textContent = message;
        setTimeout(() => { successDiv.textContent = ''; }, 3000);
    }
};

const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

const getUserProfile = async (userId) => {
    if (!userId) return null;
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
    return data;
}

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


// ===================================================================================
// LOGIKA AUTENTIKASI
// ===================================================================================
// ... (Kode autentikasi tidak berubah)


// ===================================================================================
// LOGIKA HALAMAN PROFIL
// ===================================================================================
// ... (Kode profil tidak berubah)


// ===================================================================================
// LOGIKA DASHBOARD DOSEN & EDIT KUIS
// ===================================================================================
// ... (Fungsi handleCreateQuiz dan handleQuizStatusChange tidak berubah)

const loadTeacherQuizzes = async () => {
    const user = await getUser();
    if (!user) return;
    const quizListDiv = document.getElementById('quiz-list');
    const loadingP = document.getElementById('loading-quizzes');
    const { data: quizzes, error } = await supabase.from('quizzes').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false });
    if (error) {
        showError('Gagal memuat kuis.');
        return;
    }
    loadingP.style.display = 'none';
    quizListDiv.innerHTML = '';
    quizzes.forEach(quiz => {
        const startButton = quiz.status === 'pending' ? `<button data-quiz-id="${quiz.id}" data-action="start" class="quiz-action-btn text-sm text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded-md">Mulai</button>` : '';
        const finishButton = quiz.status === 'active' ? `<button data-quiz-id="${quiz.id}" data-action="finish" class="quiz-action-btn text-sm text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md">Selesai</button>` : '';
        
        quizListDiv.innerHTML += `
            <div class="quiz-card bg-white p-5 rounded-lg shadow-md border border-gray-200 flex flex-col justify-between">
                <div>
                    <h3 class="text-xl font-bold text-gray-800 truncate">${quiz.title}</h3>
                    <p class="text-gray-500 text-sm mt-1">Status: <span class="font-semibold">${quiz.status}</span></p>
                    <div class="mt-4 bg-gray-100 p-3 rounded-md text-center">
                        <p class="text-sm text-gray-600">Kode Kuis</p>
                        <p class="text-2xl font-bold tracking-widest text-indigo-600">${quiz.code}</p>
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t">
                    <div class="flex justify-center items-center gap-2 flex-wrap">
                        <a href="edit-quiz.html?quiz_id=${quiz.id}" class="text-sm text-white bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-md">Edit</a>
                        <a href="leaderboard.html?quiz_id=${quiz.id}" class="text-sm text-white bg-gray-500 hover:bg-gray-600 px-3 py-2 rounded-md">Peringkat</a>
                        <a href="review-answers.html?quiz_id=${quiz.id}" class="text-sm text-white bg-purple-500 hover:bg-purple-600 px-3 py-2 rounded-md">Nilai Esai</a>
                        ${startButton}
                        ${finishButton}
                    </div>
                </div>
            </div>
        `;
    });
};

const loadQuizForEditing = async (quizId) => {
    // ... (Kode tidak berubah, namun pastikan input waktu bisa menerima angka 0)
    // REVISI: Tambahkan petunjuk pada input waktu
    const timeLimitInput = document.getElementById('time-limit');
    if (timeLimitInput) {
        timeLimitInput.placeholder = "Detik (0 untuk tanpa batas waktu)";
    }
};

// ===================================================================================
// LOGIKA PENILAIAN ESAI OLEH DOSEN
// ===================================================================================
const loadAnswersForReview = async (quizId) => {
    const { data: quiz, error: quizError } = await supabase.from('quizzes').select('title').eq('id', quizId).single();
    if (quizError) {
        document.body.innerHTML = '<h1>Kuis tidak ditemukan</h1>';
        return;
    }
    document.getElementById('quiz-title-review').textContent = `Menilai Jawaban Esai: ${quiz.title}`;

    const answersContainer = document.getElementById('answers-list-container');
    const loadingP = document.getElementById('loading-answers');

    const { data: answers, error } = await supabase
        .from('answers')
        .select(`*, users(full_name), questions(question_text)`)
        .eq('quiz_id', quizId)
        .eq('questions.question_type', 'essay');

    if (error) {
        loadingP.textContent = 'Gagal memuat jawaban.';
        return;
    }

    loadingP.style.display = 'none';
    answersContainer.innerHTML = '';

    if (answers.length === 0) {
        answersContainer.innerHTML = '<p>Belum ada jawaban esai yang masuk.</p>';
        return;
    }

    answers.forEach(answer => {
        const answerCard = `
            <div class="bg-white p-6 rounded-lg shadow-md">
                <p class="text-sm font-semibold text-gray-500">Pertanyaan:</p>
                <p class="mb-4 font-serif text-lg">${answer.questions.question_text}</p>
                
                <p class="text-sm font-semibold text-gray-500">Jawaban dari ${answer.users.full_name}:</p>
                <p class="mb-4 whitespace-pre-wrap">${answer.answer_text || '(Tidak ada jawaban teks)'}</p>
                
                ${answer.answer_image_url ? `
                    <div class="mb-4">
                        <p class="text-sm font-semibold text-gray-500">Gambar Terlampir:</p>
                        <a href="${answer.answer_image_url}" target="_blank" rel="noopener noreferrer">
                            <img src="${answer.answer_image_url}" alt="Jawaban Gambar" class="mt-2 max-w-xs rounded-lg border">
                        </a>
                    </div>
                ` : ''}

                <div class="mt-4 pt-4 border-t flex items-center gap-4">
                    <label for="score-${answer.id}" class="font-medium">Nilai:</label>
                    <input type="number" id="score-${answer.id}" value="${answer.score || ''}" class="w-24 px-2 py-1 border border-gray-300 rounded-md">
                    <button data-answer-id="${answer.id}" data-student-id="${answer.student_id}" class="save-score-btn px-4 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Simpan</button>
                    <span id="status-${answer.id}" class="text-sm text-green-600"></span>
                </div>
            </div>
        `;
        answersContainer.innerHTML += answerCard;
    });

    document.querySelectorAll('.save-score-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const answerId = e.target.dataset.answerId;
            const studentId = e.target.dataset.studentId;
            const newScore = document.getElementById(`score-${answerId}`).value;
            const statusEl = document.getElementById(`status-${answerId}`);

            // 1. Update skor di tabel 'answers'
            const { error: updateError } = await supabase.from('answers').update({ score: parseInt(newScore, 10) }).eq('id', answerId);
            if (updateError) {
                statusEl.textContent = 'Gagal menyimpan!';
                return;
            }

            // 2. Hitung ulang total skor untuk leaderboard
            const { data: allAnswers, error: allAnswersError } = await supabase.from('answers').select('score').eq('quiz_id', quizId).eq('student_id', studentId);
            if (allAnswersError) {
                statusEl.textContent = 'Gagal update leaderboard!';
                return;
            }

            const totalScore = allAnswers.reduce((sum, current) => sum + (current.score || 0), 0);

            // 3. Update leaderboard
            await supabase.from('leaderboard').upsert({ quiz_id: quizId, student_id: studentId, total_score: totalScore }, { onConflict: 'quiz_id, student_id' });

            statusEl.textContent = 'Tersimpan!';
            setTimeout(() => { statusEl.textContent = ''; }, 2000);
        });
    });
};

// ===================================================================================
// LOGIKA KUIS MURID
// ===================================================================================
const loadQuizForStudent = async (quizId) => {
    // ...
    const startQuestionTimer = (seconds) => {
        const timerContainer = document.getElementById('timer-container');
        // REVISI: Cek jika waktu adalah 0 atau null
        if (!seconds || seconds <= 0) {
            timerContainer.innerHTML = '<span>Tanpa Batas Waktu</span>';
            return;
        }

        clearInterval(quizState.timerId);
        let timeLeft = seconds;
        const timerEl = document.getElementById('timer');
        timerEl.textContent = timeLeft;
        quizState.timerId = setInterval(() => {
            timeLeft--;
            timerEl.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(quizState.timerId);
                submitAnswer();
            }
        }, 1000);
    };
    // ... (Sisa kode di fungsi ini tidak berubah)
};

// ===================================================================================
// ROUTER HALAMAN
// ===================================================================================
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const params = new URLSearchParams(window.location.search);

    // ... (Fungsi initializePage tidak berubah)

    const profile = await initializePage();

    if (profile) {
        switch (path) {
            // ... (Kasus lain tidak berubah)
            case 'edit-quiz.html':
                const quizIdEdit = params.get('quiz_id');
                loadQuizForEditing(quizIdEdit);
                break;
            case 'review-answers.html': // KASUS BARU
                const quizIdReview = params.get('quiz_id');
                loadAnswersForReview(quizIdReview);
                break;
            // ... (Kasus lain tidak berubah)
        }
    } else {
        // ... (Logika untuk halaman publik tidak berubah)
    }
});
