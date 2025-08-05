// assets/js/app.js (Revisi Penuh)

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


// ===================================================================================
// LOGIKA AUTENTIKASI
// ===================================================================================
const handleRegister = async (name, email, password, role) => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name, role: role } },
        });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            showError("Pengguna dengan email ini sudah ada.");
            return;
        }
        alert('Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi OTP.');
        window.location.href = `verify-otp.html?email=${encodeURIComponent(email)}`;
    } catch (error) {
        showError(`Registrasi Gagal: ${error.message}`);
    }
};

const handleLogin = async (email, password) => {
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const user = await getUser();
        const profile = await getUserProfile(user.id);
        if (profile.role === 'teacher') {
            window.location.href = 'dashboard-teacher.html';
        } else {
            window.location.href = 'dashboard-student.html';
        }
    } catch (error) {
        showError(`Login Gagal: ${error.message}`);
    }
};

const handleVerifyOtp = async (email, token) => {
    try {
        const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
        if (error) throw error;
        alert('Verifikasi berhasil! Anda sekarang bisa login.');
        window.location.href = 'index.html';
    } catch (error) {
        showError(`Verifikasi OTP Gagal: ${error.message}`);
    }
};

const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
};

// ===================================================================================
// LOGIKA HALAMAN PROFIL
// ===================================================================================
const loadProfilePage = async () => {
    const user = await getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    const profile = await getUserProfile(user.id);

    document.getElementById('full-name').value = profile.full_name;
    if (profile.profile_picture_url) {
        document.getElementById('profile-picture-preview').src = profile.profile_picture_url;
    }
    
    document.getElementById('back-to-dashboard').href = profile.role === 'teacher' ? 'dashboard-teacher.html' : 'dashboard-student.html';

    const uploadInput = document.getElementById('profile-picture-upload');
    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('profile-picture-preview').src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('full-name').value;
        const newPassword = document.getElementById('new-password').value;
        const file = uploadInput.files[0];

        try {
            const { error: nameError } = await supabase.from('users').update({ full_name: newName }).eq('id', user.id);
            if (nameError) throw nameError;

            if (newPassword) {
                const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
                if (passwordError) throw passwordError;
            }

            if (file) {
                const filePath = `profile_pictures/${user.id}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage.from('profile_pictures').upload(filePath, file);
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('profile_pictures').getPublicUrl(filePath);
                const { error: urlError } = await supabase.from('users').update({ profile_picture_url: publicUrl }).eq('id', user.id);
                if (urlError) throw urlError;
            }
            showSuccess('Profil berhasil diperbarui!');
        } catch (error) {
            showError(`Gagal memperbarui profil: ${error.message}`);
        }
    });
};


// ===================================================================================
// LOGIKA DASHBOARD DOSEN & EDIT KUIS
// ===================================================================================
const handleCreateQuiz = async (title, type) => {
    const user = await getUser();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
        const { data, error } = await supabase.from('quizzes').insert({ title, type, code, teacher_id: user.id, status: 'pending' }).select().single();
        if (error) throw error;
        alert(`Kuis "${title}" berhasil dibuat dengan kode: ${code}`);
        window.location.href = `edit-quiz.html?quiz_id=${data.id}`;
    } catch (error) {
        showError(`Gagal membuat kuis: ${error.message}`);
    }
};

const handleQuizStatusChange = async (quizId, status) => {
    const { error } = await supabase.from('quizzes').update({ status }).eq('id', quizId);
    if(error) {
        alert(`Gagal mengubah status kuis: ${error.message}`);
    } else {
        alert(`Kuis berhasil diubah ke status: ${status}!`);
        // Muat ulang daftar kuis untuk memperbarui tampilan tombol
        if (window.location.pathname.includes('dashboard-teacher.html')) {
            loadTeacherQuizzes();
        }
    }
};

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
        const startButton = quiz.status === 'pending' ? `<button data-quiz-id="${quiz.id}" data-action="start" class="quiz-action-btn text-sm text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded-md">Mulai Kuis</button>` : '';
        const finishButton = quiz.status === 'active' ? `<button data-quiz-id="${quiz.id}" data-action="finish" class="quiz-action-btn text-sm text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md">Selesai Kuis</button>` : '';
        
        quizListDiv.innerHTML += `
            <div class="quiz-card bg-white p-5 rounded-lg shadow-md border border-gray-200">
                <h3 class="text-xl font-bold text-gray-800">${quiz.title}</h3>
                <p class="text-gray-500 text-sm mt-1">Status: <span class="font-semibold">${quiz.status}</span></p>
                <div class="mt-4 bg-gray-100 p-3 rounded-md text-center">
                    <p class="text-sm text-gray-600">Kode Kuis</p>
                    <p class="text-2xl font-bold tracking-widest text-indigo-600">${quiz.code}</p>
                </div>
                <div class="mt-4 flex justify-between items-center">
                    <a href="edit-quiz.html?quiz_id=${quiz.id}" class="text-sm text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-md">Edit Soal</a>
                    <div class="flex gap-2">
                        ${startButton}
                        ${finishButton}
                    </div>
                </div>
            </div>
        `;
    });
};

const loadQuizForEditing = async (quizId) => {
    const { data: quiz, error: quizError } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
    if (quizError) {
        document.body.innerHTML = '<h1>Kuis tidak ditemukan</h1>';
        return;
    }
    document.getElementById('quiz-title-editor').textContent = quiz.title;
    document.getElementById('quiz-code-editor').textContent = `Kode: ${quiz.code}`;

    const questionsListDiv = document.getElementById('questions-list');
    const loadQuestions = async () => {
        const { data: questions, error } = await supabase.from('questions').select('*').eq('quiz_id', quizId).order('created_at');
        questionsListDiv.innerHTML = '';
        if (questions && questions.length > 0) {
            questions.forEach(q => {
                questionsListDiv.innerHTML += `<div class="p-4 bg-gray-100 rounded-md">
                    <p class="font-semibold">${q.question_text}</p>
                    <p class="text-sm text-gray-600">Jawaban: ${q.answer}</p>
                    <button data-id="${q.id}" class="delete-question-btn text-red-500 text-sm hover:underline">Hapus</button>
                </div>`;
            });
        } else {
            questionsListDiv.innerHTML = '<p>Belum ada pertanyaan.</p>';
        }
        document.querySelectorAll('.delete-question-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const questionId = e.target.dataset.id;
                try {
                    await supabase.from('questions').delete().eq('id', questionId);
                    loadQuestions();
                } catch (error) {
                    showError(`Gagal menghapus pertanyaan: ${error.message}`);
                }
            });
        });
    };
    
    await loadQuestions();

    document.getElementById('add-question-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const questionText = document.getElementById('question-text').value;
        const questionType = document.getElementById('question-type').value;
        const timeLimit = document.getElementById('time-limit').value;
        const correctAnswer = document.getElementById('correct-answer').value;
        
        const options = questionType === 'multiple_choice' ? {
            A: form.elements['option'][0].value, B: form.elements['option'][1].value,
            C: form.elements['option'][2].value, D: form.elements['option'][3].value,
        } : null;

        if (!questionText.trim() || !correctAnswer.trim()) {
            showError('Teks pertanyaan dan jawaban benar tidak boleh kosong.');
            return;
        }

        const { error } = await supabase.from('questions').insert({
            quiz_id: quizId, question_text: questionText, question_type: questionType,
            time_limit_seconds: parseInt(timeLimit, 10), options: options, answer: correctAnswer,
        });
        if (error) {
            showError(`Gagal menambah pertanyaan: ${error.message}`);
        } else {
            form.reset();
            loadQuestions();
        }
    });
};

// ===================================================================================
// LOGIKA KUIS MURID & PAPAN PERINGKAT
// ===================================================================================
const handleJoinQuiz = async (code) => {
    try {
        const { data: quiz, error } = await supabase.from('quizzes').select('id, status').eq('code', code.toUpperCase()).single();
        if (error || !quiz) throw new Error("Kuis dengan kode tersebut tidak ditemukan.");
        if (quiz.status === 'finished') throw new Error("Kuis ini sudah selesai.");
        window.location.href = `quiz.html?id=${quiz.id}`;
    } catch (error) {
        showError(error.message, 'join-error');
    }
};

const loadQuizForStudent = async (quizId) => {
    let quizState = {
        questions: [], currentQuestionIndex: 0, score: 0, timerId: null, selectedAnswer: null,
    };

    const startQuizFlow = async () => {
        document.getElementById('waiting-screen').classList.add('hidden');
        document.getElementById('quiz-container').classList.remove('hidden');

        const { data, error } = await supabase.from('questions').select('*').eq('quiz_id', quizId).order('created_at');
        if (error || !data || data.length === 0) {
            document.body.innerHTML = '<h1 class="text-white text-center text-2xl p-8">Kuis ini belum memiliki pertanyaan. Harap hubungi dosen Anda.</h1>';
            return;
        }
        quizState.questions = data;
        displayQuestion();
    };

    const displayQuestion = () => {
        quizState.selectedAnswer = null; 
        document.getElementById('submit-answer-button').disabled = false;
        if (quizState.currentQuestionIndex >= quizState.questions.length) {
            finishQuiz();
            return;
        }

        const question = quizState.questions[quizState.currentQuestionIndex];
        document.getElementById('question-text').textContent = question.question_text;
        document.getElementById('question-counter').textContent = `Soal ${quizState.currentQuestionIndex + 1} / ${quizState.questions.length}`;
        
        const answerOptionsDiv = document.getElementById('answer-options');
        answerOptionsDiv.innerHTML = '';
        if (question.question_type === 'multiple_choice') {
            const colors = ['bg-red-600', 'bg-blue-600', 'bg-yellow-500', 'bg-green-600'];
            const labels = ['A', 'B', 'C', 'D'];
            Object.entries(question.options).forEach(([key, value], index) => {
                answerOptionsDiv.innerHTML += `
                    <button data-answer="${key}" class="answer-btn p-4 rounded-lg text-left text-xl font-semibold ${colors[index]} hover:opacity-80 transition-opacity">
                        <span class="font-bold mr-2">${labels[index]}.</span> ${value}
                    </button>
                `;
            });
            document.querySelectorAll('.answer-btn').forEach(btn => btn.addEventListener('click', (e) => {
                document.querySelectorAll('.answer-btn').forEach(b => b.classList.remove('ring-4', 'ring-white'));
                e.currentTarget.classList.add('ring-4', 'ring-white');
                quizState.selectedAnswer = e.currentTarget.dataset.answer;
            }));
        }
        
        startQuestionTimer(question.time_limit_seconds || 30);
    };

    const startQuestionTimer = (seconds) => {
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
    
    const showFeedback = (isCorrect) => {
        const overlay = document.getElementById('feedback-overlay');
        const feedbackText = document.getElementById('feedback-text');
        const body = document.body;

        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        
        if (isCorrect) {
            feedbackText.textContent = 'Benar!';
            body.classList.add('bg-green-500');
        } else {
            feedbackText.textContent = 'Salah!';
            body.classList.add('bg-red-500');
        }

        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            body.classList.remove('bg-green-500', 'bg-red-500');
            quizState.currentQuestionIndex++;
            displayQuestion();
        }, 1500); // Tampilkan feedback selama 1.5 detik
    };

    const submitAnswer = async () => {
        clearInterval(quizState.timerId);
        document.getElementById('submit-answer-button').disabled = true;
        const question = quizState.questions[quizState.currentQuestionIndex];
        const isCorrect = quizState.selectedAnswer === question.answer;
        
        if (isCorrect) {
            quizState.score += 100;
        }
        
        const user = await getUser();
        await supabase.from('answers').insert({
            quiz_id: quizId, student_id: user.id, question_id: question.id,
            answer_text: quizState.selectedAnswer, score: isCorrect ? 100 : 0,
        });
        
        showFeedback(isCorrect);
    };
    
    const finishQuiz = async () => {
        const user = await getUser();
        document.getElementById('quiz-container').classList.add('hidden');
        document.getElementById('end-screen').classList.remove('hidden');

        await supabase.from('leaderboard').upsert({
            quiz_id: quizId, student_id: user.id, total_score: quizState.score
        }, { onConflict: 'quiz_id, student_id' });
    };

    document.getElementById('submit-answer-button').addEventListener('click', () => submitAnswer());

    const { data: quiz, error } = await supabase.from('quizzes').select('title, status').eq('id', quizId).single();
    if (error) {
        document.body.innerHTML = '<h1>Kuis tidak ditemukan</h1>';
        return;
    }
    document.getElementById('quiz-title-waiting').textContent = quiz.title;
    document.getElementById('leaderboard-link').href = `leaderboard.html?quiz_id=${quizId}`;

    if (quiz.status === 'active') {
        startQuizFlow();
    }

    supabase.channel(`quiz-status:${quizId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quizzes', filter: `id=eq.${quizId}` }, (payload) => {
            const waitingScreen = document.getElementById('waiting-screen');
            if (payload.new.status === 'active' && waitingScreen && !waitingScreen.classList.contains('hidden')) {
                startQuizFlow();
            }
        })
        .subscribe();
};

const loadLeaderboard = async (quizId) => {
    const { data: quiz, error: quizError } = await supabase.from('quizzes').select('title').eq('id', quizId).single();
    if(quizError) return;
    document.getElementById('quiz-title-leaderboard').textContent = `Papan Peringkat: ${quiz.title}`;

    const listEl = document.getElementById('leaderboard-list');
    const renderLeaderboard = (players) => {
        listEl.innerHTML = '';
        players.sort((a, b) => b.total_score - a.total_score).forEach((player, index) => {
            listEl.innerHTML += `
                <div class="flex items-center bg-white p-4 rounded-lg shadow">
                    <span class="text-xl font-bold w-12">${index + 1}</span>
                    <img src="${player.users.profile_picture_url || 'https://placehold.co/40x40/e2e8f0/a0aec0?text=P'}" alt="avatar" class="w-10 h-10 rounded-full mr-4">
                    <span class="font-semibold flex-grow">${player.users.full_name}</span>
                    <span class="font-bold text-lg">${player.total_score} Poin</span>
                </div>
            `;
        });
    };

    const { data: initialData, error } = await supabase.from('leaderboard').select('*, users(*)').eq('quiz_id', quizId);
    if (initialData) renderLeaderboard(initialData);

    supabase.channel(`leaderboard:${quizId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard', filter: `quiz_id=eq.${quizId}` }, async (payload) => {
            const { data, error } = await supabase.from('leaderboard').select('*, users(*)').eq('quiz_id', quizId);
            if (data) renderLeaderboard(data);
        })
        .subscribe();
};


// ===================================================================================
// ROUTER HALAMAN
// ===================================================================================
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split('/').pop() || 'index.html'; // Default ke index.html jika path kosong
    const params = new URLSearchParams(window.location.search);

    const commonAuthElements = async () => {
        const user = await getUser();
        if (!user) {
            // Jika tidak ada user dan bukan di halaman login/register, redirect
            if (path !== 'index.html' && path !== 'register.html' && path !== 'verify-otp.html' && path !== 'forgot-password.html') {
                window.location.href = 'index.html';
            }
            return;
        }
        const profile = await getUserProfile(user.id);
        const userNameDisplay = document.getElementById('user-name-display');
        if (userNameDisplay) userNameDisplay.textContent = profile.full_name;

        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    };

    switch (path) {
        case 'index.html':
            document.getElementById('login-form').addEventListener('submit', (e) => {
                e.preventDefault();
                handleLogin(e.target.email.value, e.target.password.value);
            });
            break;
        case 'register.html':
            document.getElementById('register-form').addEventListener('submit', (e) => {
                e.preventDefault();
                handleRegister(e.target.name.value, e.target.email.value, e.target.password.value, e.target.role.value);
            });
            break;
        case 'verify-otp.html':
            const email = params.get('email');
            if (email) document.getElementById('user-email-display').textContent = email;
            document.getElementById('verify-otp-form').addEventListener('submit', (e) => {
                e.preventDefault();
                handleVerifyOtp(email, e.target.otp.value);
            });
            
            const resendButton = document.getElementById('resend-otp-button');
            if(resendButton) {
                let countdown = 60; let intervalId;
                const startTimer = () => {
                    resendButton.disabled = true;
                    countdown = 60;
                    resendButton.innerHTML = `Kirim ulang kode (<span id="resend-timer">${countdown}</span>s)`;
                    intervalId = setInterval(() => {
                        countdown--;
                        const timerEl = document.getElementById('resend-timer');
                        if (timerEl) timerEl.textContent = countdown;
                        if (countdown <= 0) {
                            clearInterval(intervalId);
                            resendButton.disabled = false;
                            resendButton.textContent = 'Kirim ulang kode';
                        }
                    }, 1000);
                };
                resendButton.addEventListener('click', async () => {
                    if (resendButton.disabled) return;
                    try {
                        const { error } = await supabase.auth.resend({ type: 'signup', email: email });
                        if (error) throw error;
                        alert('Kode verifikasi baru telah berhasil dikirim.');
                        startTimer();
                    } catch (error) {
                        showError(`Gagal mengirim ulang kode: ${error.message}`);
                    }
                });
                startTimer();
            }
            break;
        case 'dashboard-teacher.html':
            commonAuthElements();
            loadTeacherQuizzes();
            document.getElementById('create-quiz-form').addEventListener('submit', (e) => {
                e.preventDefault();
                handleCreateQuiz(e.target['quiz-title'].value, e.target['quiz-type'].value);
            });
            document.getElementById('quiz-list').addEventListener('click', (e) => {
                if (e.target.matches('.quiz-action-btn')) {
                    const quizId = e.target.dataset.quizId;
                    const action = e.target.dataset.action;
                    if (action === 'start') {
                        handleQuizStatusChange(quizId, 'active');
                    } else if (action === 'finish') {
                        handleQuizStatusChange(quizId, 'finished');
                    }
                }
            });
            break;
        case 'dashboard-student.html':
            commonAuthElements();
            document.getElementById('join-quiz-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const code = document.getElementById('quiz-code').value;
                handleJoinQuiz(code);
            });
            break;
        case 'profile.html':
            commonAuthElements();
            loadProfilePage();
            break;
        case 'edit-quiz.html':
            commonAuthElements();
            const quizIdEdit = params.get('quiz_id');
            loadQuizForEditing(quizIdEdit);
            break;
        case 'quiz.html':
            commonAuthElements();
            const quizIdPlay = params.get('id');
            loadQuizForStudent(quizIdPlay);
            break;
        case 'leaderboard.html':
            commonAuthElements();
            const quizIdLeaderboard = params.get('quiz_id');
            loadLeaderboard(quizIdLeaderboard);
            break;
    }
});
