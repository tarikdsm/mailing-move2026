document.addEventListener('DOMContentLoaded', () => {
    // ======== DOM Elements ========
    const totalContactsEl = document.getElementById('total-contacts');
    const currentResultsEl = document.getElementById('current-results');
    const resultsListEl = document.getElementById('results-list');
    const initialStateEl = document.getElementById('initial-state');
    const noResultsEl = document.getElementById('no-results');
    const clearFiltersBtn = document.getElementById('clear-filters');

    // Mobile specific elements
    const mobileFeedbackEl = document.getElementById('mobile-feedback');
    const mobileResultsCountEl = document.getElementById('mobile-results-count');
    const scrollToResultsBtn = document.getElementById('scroll-to-results');

    // Inputs
    const inputs = {
        nome: document.getElementById('search-nome'),
        categoria: document.getElementById('search-categoria'),
        descricao: document.getElementById('search-descricao'),
        email: document.getElementById('search-email'),
        whatsapp: document.getElementById('search-whatsapp'),
        cidade: document.getElementById('search-cidade'),
        escola: document.getElementById('search-escola')
    };

    // Mapping between JS input keys and the exact JSON object keys from the Excel conversion
    const keyMap = {
        nome: ' NOME',
        categoria: ' CATEGORIA',
        descricao: ' DESCRIÇÃO DO CARGO/PROFISSÃO',
        email: ' E-MAIL',
        whatsapp: ' WHATSAPP',
        cidade: ' CIDADE',
        escola: ' NOME DA ESCOLA OU SETOR DA SEE'
    };

    // ======== State ========
    let contactsData = [];
    let isDataLoaded = false;

    // Performance optimization: Debounce timer
    let debounceTimer;

    // ======== Data Fetching ========
    async function loadData() {
        try {
            // Se estiver rodando localmente sem servidor (file://), o fetch pode falhar por CORS.
            // Para o GitHub Pages (https://), funcionará perfeitamente.
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            contactsData = await response.json();

            // Atualiza contagem
            totalContactsEl.textContent = contactsData.length.toLocaleString('pt-BR');
            isDataLoaded = true;

            console.log("Dados carregados com sucesso!", contactsData.length, "registros.");
        } catch (error) {
            console.error("Erro ao carregar data.json:", error);
            initialStateEl.innerHTML = `
                <div style="color: #ef4444; max-width: 400px; margin: 0 auto; text-align: center;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 1rem;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3>Erro ao carregar banco de dados</h3>
                    <p>Para visualizar este site localmente, você precisa usar um servidor local (ex: Live Server do VSCode, ou rodar 'npx serve' no terminal) devido a políticas de segurança dos navegadores para carregamento de arquivos JSON.</p>
                </div>
            `;
        }
    }

    // ======== Search Logic ========
    function handleSearchInput() {
        if (!isDataLoaded) return;

        // Collect all active filters (converted to lowercase for case-insensitive search)
        const filters = {};
        let hasActiveFilters = false;

        for (const [key, inputEl] of Object.entries(inputs)) {
            const val = inputEl.value.trim().toLowerCase();
            if (val.length > 0) {
                filters[key] = val;
                hasActiveFilters = true;
            }
        }

        // Se todos os campos estiverem vazios, volta ao estado zero
        if (!hasActiveFilters) {
            resetView();
            return;
        }

        // Realiza o filtro!
        // A pesquisa vai afunilando: um contato tem que bater com TODOS os campos preenchidos
        const filteredResults = contactsData.filter(contact => {
            for (const [filterKey, filterValue] of Object.entries(filters)) {

                // Pega o nome exato da coluna no JSON para a chave correspondente
                const dataKey = keyMap[filterKey];

                // Valor no banco
                const cellValue = contact[dataKey];

                // Se a célula não existe ou é vazia, e estamos buscando nela, então não bateu.
                if (cellValue === undefined || cellValue === null || cellValue === '') {
                    return false;
                }

                // Convert para string (para cobrir números como telefones, CEPs, etc) e minúsculo
                const stringValue = String(cellValue).toLowerCase();

                // Verifica se o texto digitado ESTÁ CONTIDO na célula do banco
                if (!stringValue.includes(filterValue)) {
                    return false; // falhou neste filtro, descarta o contato
                }
            }
            return true; // Passou por todos os filtros ativos
        });

        // Limita resultados para performance extrema do DOM (opcional, pode ser removido, mas renderizar 5mil cards de uma vez traria lag visual)
        // Como o usuário quer achar 1 pessoa, quando afunilar vai sobrar só os certos.
        // limitamos a 100 maximos DOM elements por vez (ou mais).
        const maxDisplay = 150;
        const resultsToDisplay = filteredResults.slice(0, maxDisplay);

        renderResults(resultsToDisplay, filteredResults.length, maxDisplay, filters);
    }

    // Função auxiliar para criar ícones SVG
    const icons = {
        user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
        mapPin: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
        mail: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
        phone: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
        school: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
        briefcase: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`
    };

    // Função para destacar o termo pesquisado
    function highlightText(text, filterObj, fieldKey) {
        if (!text) return '-';
        const str = String(text);

        // Verifica se há termo de busca para este campo específico
        if (filterObj && filterObj[fieldKey]) {
            const searchTerm = filterObj[fieldKey];
            const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
            return str.replace(regex, '<mark>$1</mark>');
        }
        return str;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escapa caracteres especiais para Regex seguro
    }

    // ======== Rendering ========
    function renderResults(results, totalFound, maxDisplay, currentFilters) {
        // Toggle empty states
        initialStateEl.classList.remove('visible');

        if (results.length === 0) {
            noResultsEl.classList.add('visible');
            resultsListEl.innerHTML = '';
            currentResultsEl.textContent = '0';
            hideMobileFeedback();
            return;
        }

        noResultsEl.classList.remove('visible');

        // Se houverem muitos resultados informamos o teto, senão mostramos o exato
        let countText = totalFound.toString();
        if (totalFound > maxDisplay) {
            countText = `${maxDisplay} de ${totalFound}`;
        }
        currentResultsEl.textContent = countText;

        // Show feedback on mobile
        showMobileFeedback(countText);

        // Build HTML for all cards
        let htmlContent = '';

        results.forEach(contact => {
            // Helpers
            const nome = contact[keyMap.nome] || 'Sem Nome';
            const cat = contact[keyMap.categoria] || '';
            const desc = contact[keyMap.descricao] || '';
            const email = contact[keyMap.email] || '';
            const whats = contact[keyMap.whatsapp] || '';
            const city = contact[keyMap.cidade] || '';
            const uf = contact[' UF/STATE'] || '';
            const escola = contact[keyMap.escola] || '';

            // Format City State
            let location = city;
            if (city && uf) location = `${city} - ${uf}`;
            else if (uf) location = uf;

            // Highlighted HTMLs
            const hNome = highlightText(nome, currentFilters, 'nome');
            const hCat = highlightText(cat, currentFilters, 'categoria');
            const hDesc = highlightText(desc, currentFilters, 'descricao');
            const hEmail = highlightText(email, currentFilters, 'email');
            const hWhats = highlightText(whats, currentFilters, 'whatsapp');
            const hCity = highlightText(location, currentFilters, 'cidade');
            const hEscola = highlightText(escola, currentFilters, 'escola');

            htmlContent += `
                <div class="contact-card">
                    <div class="card-header">
                        <div class="contact-name">${hNome}</div>
                        ${cat ? `<div class="contact-cat">${hCat}</div>` : ''}
                    </div>
                    
                    <div class="card-body">
                        ${desc ? `
                        <div class="data-row">
                            <div class="data-icon">${icons.briefcase}</div>
                            <div class="data-content">
                                <span class="data-label">Descrição / Cargo</span>
                                <span class="data-value">${hDesc}</span>
                            </div>
                        </div>` : ''}

                        ${escola ? `
                        <div class="data-row">
                            <div class="data-icon">${icons.school}</div>
                            <div class="data-content">
                                <span class="data-label">Escola / Instituição</span>
                                <span class="data-value">${hEscola}</span>
                            </div>
                        </div>` : ''}

                        ${(city || uf) ? `
                        <div class="data-row">
                            <div class="data-icon">${icons.mapPin}</div>
                            <div class="data-content">
                                <span class="data-label">Cidade</span>
                                <span class="data-value">${hCity}</span>
                            </div>
                        </div>` : ''}

                        ${email ? `
                        <div class="data-row">
                            <div class="data-icon">${icons.mail}</div>
                            <div class="data-content">
                                <span class="data-label">E-mail</span>
                                <span class="data-value">${hEmail}</span>
                            </div>
                        </div>` : ''}

                        ${whats ? `
                        <div class="data-row">
                            <div class="data-icon">${icons.phone}</div>
                            <div class="data-content">
                                <span class="data-label">WhatsApp</span>
                                <span class="data-value">${hWhats}</span>
                            </div>
                        </div>` : ''}
                    </div>
                </div>
            `;
        });

        // Inject into DOM
        resultsListEl.innerHTML = htmlContent;
    }

    function resetView() {
        resultsListEl.innerHTML = '';
        currentResultsEl.textContent = '0';
        noResultsEl.classList.remove('visible');
        initialStateEl.classList.add('visible');
        hideMobileFeedback();
    }

    // ======== Mobile Feedback Handlers ========
    let feedbackTimeout;

    function showMobileFeedback(count) {
        if (window.innerWidth > 768) return; // Only relevant for mobile

        mobileResultsCountEl.textContent = count;
        mobileFeedbackEl.classList.add('visible');

        // Auto-hide the toast after 4 seconds of inactivity
        clearTimeout(feedbackTimeout);
        feedbackTimeout = setTimeout(hideMobileFeedback, 4000);
    }

    function hideMobileFeedback() {
        mobileFeedbackEl.classList.remove('visible');
    }

    // ======== Event Listeners ========

    // Attach input listeners to all search inputs with debouncing
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            // 150ms delay for performance during fast typing
            debounceTimer = setTimeout(handleSearchInput, 150);
        });
    });

    // Clear filters button
    clearFiltersBtn.addEventListener('click', () => {
        Object.values(inputs).forEach(input => {
            input.value = '';
        });
        resetView();
    });

    // Mobile scroll button
    scrollToResultsBtn.addEventListener('click', () => {
        // Obter uma estimativa justa da seção de resultados
        const yOffset = -20;
        const element = document.querySelector('.results-section');
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;

        window.scrollTo({ top: y, behavior: 'smooth' });
        hideMobileFeedback();
    });

    // Hide mobile feedback when actively scrolling down normally
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300 && mobileFeedbackEl.classList.contains('visible')) {
            // Se o usuário rolou a página ele mesmo, sumir com o toast para não poluir
            hideMobileFeedback();
        }
    }, { passive: true });

    // Initialize fetching
    loadData();
});
