document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://celestial-api.onrender.com';
    // Use as URLs fornecidas no seu .env para consistência
    const FRONTEND_LOGIN_URL = 'https://jesusdiscordjs.github.io/Celestial/'; // Ou o que estiver no seu .env
    // const FRONTEND_DASHBOARD_URL = 'https://jesusdiscordjs.github.io/Celestial/dashboard.html'; // Já estamos na dashboard ou index

    const path = window.location.pathname;

    if (document.getElementById('loginButton')) {
        // --- LÓGICA DA PÁGINA DE LOGIN (index.html) ---
        const loginButton = document.getElementById('loginButton');
        const errorMessageElement = document.getElementById('errorMessage');

        // Verifica se houve erro no login (redirecionado pela API)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('error') && urlParams.get('error') === 'auth_failed') {
            if (errorMessageElement) {
                errorMessageElement.textContent = 'Falha na autenticação com o Discord. Tente novamente.';
            }
        }

        if (loginButton) {
            loginButton.addEventListener('click', () => {
                window.location.href = `${API_BASE_URL}/auth/discord`;
            });
        }
    } else if (document.querySelector('.dashboard-container')) {
        // --- LÓGICA DA PÁGINA DE DASHBOARD (dashboard.html) ---
        const usernameElement = document.getElementById('username');
        const userAvatarElement = document.getElementById('userAvatar');
        const logoutButton = document.getElementById('logoutButton');
        const discordUserIdInput = document.getElementById('discordUserId');
        const trackUserButton = document.getElementById('trackUserButton');
        const resultsSection = document.getElementById('resultsSection');
        const trackerResultsElement = document.getElementById('trackerResults');
        const trackedUserIdElement = document.getElementById('trackedUserId');
        const trackerErrorMessageElement = document.getElementById('trackerErrorMessage');

        const fetchWithCredentials = async (url, options = {}) => {
            return fetch(url, {
                ...options,
                credentials: 'include' // Envia cookies para a API
            });
        };

        // 1. Verificar status de autenticação e buscar dados do usuário
        const checkAuthStatus = async () => {
            try {
                const response = await fetchWithCredentials(`${API_BASE_URL}/api/me`);
                if (!response.ok) {
                    if (response.status === 401) {
                        // Não autorizado, redirecionar para login
                        window.location.href = FRONTEND_LOGIN_URL; // Usa a URL base do frontend
                        return;
                    }
                    throw new Error(`Erro ao buscar dados do usuário: ${response.statusText}`);
                }
                const userData = await response.json();

                if (usernameElement) usernameElement.textContent = userData.username;
                if (userAvatarElement && userData.avatar) {
                    const avatarExtension = userData.avatar.startsWith('a_') ? 'gif' : 'png';
                    userAvatarElement.src = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.${avatarExtension}?size=128`;
                } else if (userAvatarElement) {
                    userAvatarElement.src = 'https://via.placeholder.com/50/7289da/ffffff?text=N/A'; // Placeholder se não houver avatar
                }

            } catch (error) {
                console.error('Erro de autenticação:', error);
                if (usernameElement) usernameElement.textContent = 'Erro ao carregar';
                // Em caso de erro grave (ex: API offline), pode ser útil redirecionar também
                // ou mostrar uma mensagem de erro mais proeminente.
                // Por ora, se /api/me falhar e não for 401, o usuário fica na dashboard com erro.
            }
        };

        // 2. Logout
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                try {
                    const response = await fetchWithCredentials(`${API_BASE_URL}/auth/logout`);
                    const data = await response.json();
                    if (response.ok) {
                         // A API envia redirectTo, que deve ser a FRONTEND_LOGIN_URL
                        window.location.href = data.redirectTo || FRONTEND_LOGIN_URL;
                    } else {
                        console.error('Erro no logout:', data.message || 'Erro desconhecido');
                        trackerErrorMessageElement.textContent = `Erro no logout: ${data.message || 'Tente novamente.'}`;
                    }
                } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                    trackerErrorMessageElement.textContent = 'Erro de rede ao tentar fazer logout.';
                }
            });
        }

        // 3. Funcionalidade de Rastrear Usuário
        if (trackUserButton && discordUserIdInput) {
            trackUserButton.addEventListener('click', async () => {
                const userIdToTrack = discordUserIdInput.value.trim();
                if (!userIdToTrack) {
                    trackerErrorMessageElement.textContent = 'Por favor, insira um ID de usuário do Discord.';
                    return;
                }
                // Validação simples do ID (apenas dígitos e comprimento comum)
                if (!/^\d{17,19}$/.test(userIdToTrack)) {
                    trackerErrorMessageElement.textContent = 'Formato de ID inválido. Deve conter entre 17 e 19 dígitos.';
                    return;
                }

                trackerErrorMessageElement.textContent = ''; // Limpa erros anteriores
                resultsSection.style.display = 'none';
                trackerResultsElement.innerHTML = '<p>Carregando...</p>';

                try {
                    const response = await fetchWithCredentials(`${API_BASE_URL}/api/avatars/${userIdToTrack}`);
                    const data = await response.json();

                    if (!response.ok) {
                        trackerErrorMessageElement.textContent = data.error || `Erro ${response.status}: Falha ao buscar dados.`;
                        return;
                    }

                    // Exibir resultados
                    trackedUserIdElement.textContent = data.userId;
                    let resultsHTML = `
                        <p><strong>ID do Usuário:</strong> ${data.userId}</p>
                        <p><strong>Nomes de Usuário Registrados:</strong></p>
                        <ul>${data.usernames && data.usernames.length > 0 ? data.usernames.map(name => `<li>${name}</li>`).join('') : '<li>Nenhum nome registrado.</li>'}</ul>
                        <p><strong>Avatares Registrados:</strong></p>
                        <ul>`;

                    if (data.avatars && data.avatars.length > 0) {
                        data.avatars.forEach(avatarUrl => {
                            resultsHTML += `<li><img src="${avatarUrl}" alt="Avatar"> ${avatarUrl.substring(avatarUrl.lastIndexOf('/') + 1)}</li>`;
                        });
                    } else {
                        resultsHTML += '<li>Nenhum avatar registrado.</li>';
                    }
                    resultsHTML += '</ul>';

                    if (data.lastJoinCall && data.lastJoinCall.timestamp) {
                        resultsHTML += `<p><strong>Última Entrada em Chamada:</strong> Canal ID ${data.lastJoinCall.channelId} em ${new Date(data.lastJoinCall.timestamp).toLocaleString('pt-BR')}</p>`;
                    } else {
                        resultsHTML += `<p><strong>Última Entrada em Chamada:</strong> Não registrado.</p>`;
                    }
                     if (data.lastLeaveCall && data.lastLeaveCall.timestamp) {
                        resultsHTML += `<p><strong>Última Saída de Chamada:</strong> Canal ID ${data.lastLeaveCall.channelId} em ${new Date(data.lastLeaveCall.timestamp).toLocaleString('pt-BR')}</p>`;
                    } else {
                        resultsHTML += `<p><strong>Última Saída de Chamada:</strong> Não registrado.</p>`;
                    }

                    resultsHTML += `<p><strong>Criado em:</strong> ${new Date(data.createdAt).toLocaleString('pt-BR')}</p>`;
                    resultsHTML += `<p><strong>Atualizado em:</strong> ${new Date(data.updatedAt).toLocaleString('pt-BR')}</p>`;

                    trackerResultsElement.innerHTML = resultsHTML;
                    resultsSection.style.display = 'block';

                } catch (error) {
                    console.error('Erro ao rastrear usuário:', error);
                    trackerErrorMessageElement.textContent = 'Erro de rede ou API indisponível ao tentar rastrear.';
                    trackerResultsElement.innerHTML = '';
                }
            });
        }

        // Chamar a verificação de autenticação ao carregar a dashboard
        checkAuthStatus();
    }
});