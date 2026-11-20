// --- DOM Elements ---
const chatBox = document.getElementById('chat-box');
const messagesContainer = document.getElementById('messages-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
const welcomeScreen = document.getElementById('welcome-screen');
const chatHistoryList = document.getElementById('chat-history-list');
const sidebar = document.getElementById('sidebar');
const mobileOverlay = document.getElementById('mobile-overlay');
const themeToggleBtn = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;
const micBtn = document.getElementById('mic-btn');
const imageInput = document.getElementById('image-input');

// --- State ---
let chats = JSON.parse(localStorage.getItem('vini_chats')) || [];
let currentChatId = null;
let isGenerating = false;
let abortController = null;

// --- Theme Logic ---
if (localStorage.getItem('theme') === 'light') {
    htmlElement.classList.remove('dark');
} else {
    htmlElement.classList.add('dark');
}

themeToggleBtn.addEventListener('click', () => {
    if (htmlElement.classList.contains('dark')) {
        htmlElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        htmlElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
});

// --- Voice Search ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isRecording = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'hi-IN';

    recognition.onstart = () => { isRecording = true; micBtn.classList.add('recording'); };
    recognition.onend = () => { isRecording = false; micBtn.classList.remove('recording'); };
    recognition.onresult = (event) => {
        userInput.value += (userInput.value ? ' ' : '') + event.results[0][0].transcript;
        autoResize(userInput);
    };

    micBtn.addEventListener('click', () => {
        if (isRecording) recognition.stop(); else recognition.start();
    });
} else {
    micBtn.style.display = 'none';
}

// --- Image Upload ---
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const imgData = event.target.result;
            if (welcomeScreen.style.display !== 'none') welcomeScreen.style.display = 'none';
            
            const currentChat = chats.find(c => c.id === currentChatId);
            if (currentChat.messages.length === 0) {
                currentChat.title = "Shared an image";
                renderHistory();
            }
            
            const msgWrapper = document.createElement('div');
            msgWrapper.className = `flex justify-end w-full mb-4`;
            msgWrapper.innerHTML = `
                <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-2xl rounded-tr-sm max-w-[80%] shadow-md">
                    <img src="${imgData}" class="max-w-[200px] rounded-lg">
                </div>
            `;
            messagesContainer.appendChild(msgWrapper);
            chatBox.scrollTop = chatBox.scrollHeight;

            currentChat.messages.push({ role: 'user', content: '[Image Shared]', image: imgData });
            saveChats();

            setTimeout(() => {
                addMessageUI('assistant', 'Maine aapki image dekh li hai! Lekin abhi main isko analyze nahi kar sakta. Aap iske baare mein kuch likh kar pooch sakte hain.');
            }, 1000);

            imageInput.value = '';
        };
        reader.readAsDataURL(file);
    }
});

// --- Initialization ---
function init() {
    if (chats.length > 0) loadChat(chats[0].id);
    else startNewChat();
    renderHistory();
}

// --- Sidebar Navigation ---
function toggleSidebar() {
    sidebar.classList.toggle('-translate-x-full');
    mobileOverlay.classList.toggle('hidden');
}

function startNewChat() {
    if (isGenerating) stopGeneration();
    
    const newChat = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: []
    };
    chats.unshift(newChat);
    currentChatId = newChat.id;
    saveChats();
    renderHistory();
    loadChat(currentChatId);
    
    if (window.innerWidth < 768) toggleSidebar();
}

function loadChat(id) {
    currentChatId = id;
    const chat = chats.find(c => c.id === id);
    messagesContainer.innerHTML = '';
    
    if (!chat || chat.messages.length === 0) {
        welcomeScreen.style.display = 'flex';
    } else {
        welcomeScreen.style.display = 'none';
        chat.messages.forEach(msg => {
            if(msg.image) {
                const msgWrapper = document.createElement('div');
                msgWrapper.className = `flex justify-end w-full mb-4`;
                msgWrapper.innerHTML = `
                    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-2xl rounded-tr-sm max-w-[80%] shadow-md">
                        <img src="${msg.image}" class="max-w-[200px] rounded-lg">
                    </div>
                `;
                messagesContainer.appendChild(msgWrapper);
            } else {
                addMessageUI(msg.role, msg.content, false);
            }
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    renderHistory();
}

// --- History Grouping Logic ---
function renderHistory() {
    chatHistoryList.innerHTML = '';
    
    let groups = { 'Today': [], '7 Days': [], '30 Days': [], 'Older': [] };
    const now = Date.now();

    chats.forEach(chat => {
        const time = parseInt(chat.id);
        const diffDays = (now - time) / (1000 * 60 * 60 * 24);
        
        if (diffDays < 1) groups['Today'].push(chat);
        else if (diffDays < 7) groups['7 Days'].push(chat);
        else if (diffDays < 30) groups['30 Days'].push(chat);
        else groups['Older'].push(chat);
    });

    for (const [title, items] of Object.entries(groups)) {
        if (items.length > 0) {
            const header = document.createElement('div');
            header.className = 'text-[11px] font-semibold text-slate-500 dark:text-gray-500 mt-5 mb-2 px-2';
            header.textContent = title;
            chatHistoryList.appendChild(header);

            items.forEach(chat => {
                const isActive = chat.id === currentChatId;
                const btn = document.createElement('button');
                btn.className = `w-full text-left px-3 py-2 rounded-lg text-[13px] truncate transition-colors flex items-center justify-between group mb-0.5 ${
                    isActive 
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white font-medium shadow-sm' 
                    : 'text-slate-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5'
                }`;
                btn.innerHTML = `
                    <span class="truncate flex-1">${chat.title}</span>
                    ${isActive ? '<i class="fa-solid fa-ellipsis text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs ml-2"></i>' : ''}
                `;
                btn.onclick = () => loadChat(chat.id);
                chatHistoryList.appendChild(btn);
            });
        }
    }
}

function saveChats() {
    localStorage.setItem('vini_chats', JSON.stringify(chats));
}

// --- Message UI (Premium Gradient Bubbles) ---
function addMessageUI(role, text, scroll=true) {
    welcomeScreen.style.display = 'none';
    
    const msgWrapper = document.createElement('div');
    msgWrapper.className = `flex w-full mb-6 ${role === 'user' ? 'justify-end' : 'justify-start'}`;

    if (role === 'user') {
        // User Bubble - Gradient, W-fit, Premium
        msgWrapper.innerHTML = `
            <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%] shadow-md text-[15px] leading-relaxed break-words w-fit">
                ${text}
            </div>
        `;
        messagesContainer.appendChild(msgWrapper);
        if(scroll) chatBox.scrollTop = chatBox.scrollHeight;
        return msgWrapper.querySelector('div');
    } else {
        // AI Message - Clean, No bubble, Glowing Avatar
        const contentDiv = document.createElement('div');
        contentDiv.className = `flex gap-3 w-full max-w-[100%]`;
        
        const avatar = `
            <div class="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm mt-1">
                <i class="fa-solid fa-bolt text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-600 text-xs"></i>
            </div>
        `;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'flex-1 overflow-hidden prose dark:prose-invert max-w-none text-[15px] leading-relaxed text-slate-800 dark:text-gray-200 pt-0.5';
        textDiv.innerHTML = marked.parse(text);
        
        // Code Block Styling
        textDiv.querySelectorAll('pre').forEach((pre) => {
            const code = pre.querySelector('code');
            if(code) {
                const langClass = Array.from(code.classList).find(c => c.startsWith('language-'));
                const lang = langClass ? langClass.replace('language-', '') : 'code';
                
                const header = document.createElement('div');
                header.className = 'flex items-center justify-between bg-[#161b22] px-4 py-1.5 text-xs text-gray-400 rounded-t-lg border border-b-0 border-[#30363d] mt-4';
                header.innerHTML = `
                    <span>${lang}</span>
                    <button class="hover:text-white transition-colors" onclick="navigator.clipboard.writeText(\`${code.innerText.replace(/`/g, '\\`')}\`); this.innerHTML='<i class=\\'fa-solid fa-check text-green-500\\'></i> Copied!'">
                        <i class="fa-regular fa-copy"></i> Copy
                    </button>
                `;
                pre.parentNode.insertBefore(header, pre);
                pre.style.marginTop = '0';
                pre.style.borderTopLeftRadius = '0';
                pre.style.borderTopRightRadius = '0';
            }
        });

        contentDiv.innerHTML = avatar;
        contentDiv.appendChild(textDiv);
        msgWrapper.appendChild(contentDiv);
        messagesContainer.appendChild(msgWrapper);
        
        textDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        if(scroll) chatBox.scrollTop = chatBox.scrollHeight;
        return textDiv;
    }
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

// --- Chat Logic ---
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || isGenerating) return;

    const currentChat = chats.find(c => c.id === currentChatId);
    
    if (currentChat.messages.length === 0) {
        currentChat.title = text.substring(0, 25) + (text.length > 25 ? '...' : '');
        renderHistory();
    }

    addMessageUI('user', text);
    currentChat.messages.push({ role: 'user', content: text });
    saveChats();
    
    userInput.value = '';
    autoResize(userInput);
    
    isGenerating = true;
    sendBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    abortController = new AbortController();

    const assistantDiv = addMessageUI('assistant', '');
    assistantDiv.innerHTML = '<span class="text-slate-500 animate-pulse flex items-center gap-2"><i class="fa-solid fa-circle-notch fa-spin"></i> Thinking...</span>'; 
    
    let assistantText = '';
    let isFirstChunk = true;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: currentChat.messages }),
            signal: abortController.signal
        });

        if (!response.ok) throw new Error("Server error");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine || cleanLine === 'data: [DONE]') continue;
                
                if (cleanLine.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(cleanLine.slice(6));
                        const choice = data.choices && data.choices[0];
                        const delta = choice && choice.delta;
                        const content = (delta && delta.content) ? delta.content : '';
                        
                        if (content) {
                            if (isFirstChunk) {
                                assistantDiv.innerHTML = '';
                                isFirstChunk = false;
                            }
                            assistantText += content;
                            assistantDiv.innerHTML = marked.parse(assistantText);
                            
                            assistantDiv.querySelectorAll('pre code').forEach((block) => {
                                if(!block.classList.contains('hljs')) hljs.highlightElement(block);
                            });
                            chatBox.scrollTop = chatBox.scrollHeight;
                        }
                    } catch (e) {}
                }
            }
        }
        
        currentChat.messages.push({ role: 'assistant', content: assistantText });
        saveChats();

    } catch (error) {
        if (error.name === 'AbortError') {
            assistantText += '\n\n*(Stopped)*';
            assistantDiv.innerHTML = marked.parse(assistantText);
            currentChat.messages.push({ role: 'assistant', content: assistantText });
            saveChats();
        } else {
            assistantDiv.innerHTML = `<span class="text-red-500"><i class="fa-solid fa-triangle-exclamation"></i> Connection Error. Check your server.</span>`;
        }
    } finally {
        isGenerating = false;
        sendBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        userInput.focus();
    }
}

function stopGeneration() {
    if (abortController) abortController.abort();
}

// --- Event Listeners ---
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); 
        sendMessage();
    }
});

// Start the app
init();