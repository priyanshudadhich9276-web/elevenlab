/**
 * ElevenLabs Voice Studio - Application Logic
 * Integrates ElevenLabs Text-to-Speech API with rich controls,
 * Web Audio API visualizer, and customizable models.
 */

// --- Model Descriptions Mapping ---
const MODEL_DESCRIPTIONS = {
  'eleven_multilingual_v2': 'Multilingual v2: State-of-the-art lifelike voice synthesis across 29 languages with nuanced emotional expression.',
  'eleven_turbo_v2_5': 'Turbo v2.5: High quality with significantly reduced latency, ideal for real-time applications and conversational AI.',
  'eleven_flash_v2_5': 'Flash v2.5: Ultra-low latency (~75ms) model designed for real-time conversational agents and high throughput.',
  'eleven_turbo_v2': 'Turbo v2: Blazing fast generation optimized for English speech.',
  'eleven_monolingual_v1': 'Monolingual v1: Classic English generation model with reliable stability.'
};

// --- Sample Presets ---
const SAMPLES = {
  story: "Deep within the bioluminescent canopy of Kepler-452b, the ancient crystals began to hum with a resonance long thought forgotten. Commander Vance adjusted her visor, watching the fractal light patterns dance across the alien moss. 'Central,' she whispered into the comm-link, 'we are not the first explorers to stand here.'",
  tech: "Welcome back to Tech Pulse. Today, the boundaries of artificial voice synthesis have been rewritten. ElevenLabs' neural audio models now capture human emotion, breath cadence, and subtle vocal inflections with astonishing realism. Here is the full breakdown of today's breakthrough.",
  quote: "Do not go gentle into that good night. Rage, rage against the dying of the light. Though wise men at their end know dark is right, because their words had forked no lightning, they do not go gentle into that good night."
};

// Default API Key provided by user
const DEFAULT_API_KEY = 'sk_5e758a984448950c4b1c7145178499ec7993775f96291512';

// --- State Management ---
const state = {
  apiKey: localStorage.getItem('elevenlabs_api_key') || DEFAULT_API_KEY,
  currentAudioUrl: null,
  currentAudioBlob: null,
  currentTakeMeta: null,
  isPlaying: false,
  playbackSpeed: 1.0,
  history: [],
  audioCtx: null,
  analyser: null,
  sourceNode: null,
  isVisualizerRunning: false,
  animationFrameId: null
};

// --- DOM Elements ---
const elements = {
  // Text & Inputs
  textInput: document.getElementById('textInput'),
  charCount: document.getElementById('charCount'),
  wordCount: document.getElementById('wordCount'),
  estTime: document.getElementById('estTime'),
  pasteBtn: document.getElementById('pasteBtn'),
  clearBtn: document.getElementById('clearBtn'),
  sampleChips: document.querySelectorAll('.sample-chip'),

  // Config Selectors
  modelSelect: document.getElementById('modelSelect'),
  modelDescription: document.getElementById('modelDescription'),
  voiceSelect: document.getElementById('voiceSelect'),
  customVoiceGroup: document.getElementById('customVoiceGroup'),
  customVoiceInputWrap: document.getElementById('customVoiceInputWrap'),
  customVoiceId: document.getElementById('customVoiceId'),
  refreshVoicesBtn: document.getElementById('refreshVoicesBtn'),

  // Sliders & Tuning
  stabilityRange: document.getElementById('stabilityRange'),
  stabilityVal: document.getElementById('stabilityVal'),
  similarityRange: document.getElementById('similarityRange'),
  similarityVal: document.getElementById('similarityVal'),
  styleRange: document.getElementById('styleRange'),
  styleVal: document.getElementById('styleVal'),
  speakerBoostToggle: document.getElementById('speakerBoostToggle'),

  // Generation & Play
  playBtn: document.getElementById('playBtn'),
  playBtnText: document.getElementById('playBtnText'),
  playBtnSpinner: document.getElementById('playBtnSpinner'),
  playBtnIcon: document.getElementById('playBtnIcon'),

  // Player Deck & Visualizer
  nativeAudio: document.getElementById('nativeAudioElement'),
  visualizerCanvas: document.getElementById('visualizerCanvas'),
  visualizerIdleState: document.getElementById('visualizerIdleState'),
  playbackBadge: document.getElementById('playbackBadge'),
  playbackBadgeText: document.getElementById('playbackBadgeText'),
  activeModelPill: document.getElementById('activeModelPill'),
  currentTime: document.getElementById('currentTime'),
  totalDuration: document.getElementById('totalDuration'),
  progressBar: document.getElementById('progressBar'),
  progressFilled: document.getElementById('progressFilled'),
  deckPlayPauseBtn: document.getElementById('deckPlayPauseBtn'),
  deckPlayIcon: document.getElementById('deckPlayIcon'),
  deckPauseIcon: document.getElementById('deckPauseIcon'),
  skipBackBtn: document.getElementById('skipBackBtn'),
  skipForwardBtn: document.getElementById('skipForwardBtn'),
  speedBtn: document.getElementById('speedBtn'),
  downloadAudioBtn: document.getElementById('downloadAudioBtn'),

  // Take Info & History
  takeDetails: document.getElementById('takeDetails'),
  takeVoiceName: document.getElementById('takeVoiceName'),
  takeModelName: document.getElementById('takeModelName'),
  takeAudioSize: document.getElementById('takeAudioSize'),
  historyList: document.getElementById('historyList'),
  historyCount: document.getElementById('historyCount'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),

  // API Modal & Key
  apiKeyModalBtn: document.getElementById('apiKeyModalBtn'),
  apiStatusDot: document.getElementById('apiStatusDot'),
  apiStatusText: document.getElementById('apiStatusText'),
  apiKeyModal: document.getElementById('apiKeyModal'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  toggleApiKeyVis: document.getElementById('toggleApiKeyVis'),
  eyeIconOpen: document.getElementById('eyeIconOpen'),
  eyeIconClosed: document.getElementById('eyeIconClosed'),
  saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
  verifyApiKeyBtn: document.getElementById('verifyApiKeyBtn'),
  clearApiKeyBtn: document.getElementById('clearApiKeyBtn'),
  demoAudioBtn: document.getElementById('demoAudioBtn'),
  apiKeyVerificationMsg: document.getElementById('apiKeyVerificationMsg'),

  // Toast Container
  toastContainer: document.getElementById('toastContainer')
};

// ============================================================================
// Initialization
// ============================================================================
function init() {
  updateApiStatusIndicator();
  updateTextCounters();
  updateModelDescription();
  initVisualizer();
  attachEventListeners();

  // If text input is empty, load a default engaging sample
  if (!elements.textInput.value.trim()) {
    elements.textInput.value = SAMPLES.story;
    updateTextCounters();
  }

  // Auto-fetch account voices if API key is already configured
  if (state.apiKey) {
    fetchAccountVoices();
  }
}

// ============================================================================
// Event Listeners
// ============================================================================
function attachEventListeners() {
  // Text area inputs & stats
  elements.textInput.addEventListener('input', updateTextCounters);
  
  elements.pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        elements.textInput.value = text;
        updateTextCounters();
        showToast('Text pasted from clipboard', 'info');
      }
    } catch {
      showToast('Clipboard access denied. Please paste manually.', 'warning');
    }
  });

  elements.clearBtn.addEventListener('click', () => {
    elements.textInput.value = '';
    updateTextCounters();
    elements.textInput.focus();
  });

  // Preset Chips
  elements.sampleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const sampleKey = chip.dataset.sample;
      if (SAMPLES[sampleKey]) {
        elements.textInput.value = SAMPLES[sampleKey];
        updateTextCounters();
        showToast(`Loaded ${chip.textContent} preset`, 'info');
      }
    });
  });

  // Model Selection Change
  elements.modelSelect.addEventListener('change', () => {
    updateModelDescription();
  });

  // Voice Selection Change
  elements.voiceSelect.addEventListener('change', () => {
    if (elements.voiceSelect.value === 'custom') {
      elements.customVoiceInputWrap.classList.remove('hidden');
      elements.customVoiceId.focus();
    } else {
      elements.customVoiceInputWrap.classList.add('hidden');
    }
  });

  // Refresh Account Voices
  elements.refreshVoicesBtn.addEventListener('click', fetchAccountVoices);

  // Tuning Sliders
  elements.stabilityRange.addEventListener('input', (e) => {
    elements.stabilityVal.textContent = parseFloat(e.target.value).toFixed(2);
  });
  elements.similarityRange.addEventListener('input', (e) => {
    elements.similarityVal.textContent = parseFloat(e.target.value).toFixed(2);
  });
  elements.styleRange.addEventListener('input', (e) => {
    elements.styleVal.textContent = parseFloat(e.target.value).toFixed(2);
  });

  // Main Action Generate & Play
  elements.playBtn.addEventListener('click', handleGenerateAndPlay);

  // Deck Player Controls
  elements.deckPlayPauseBtn.addEventListener('click', togglePlayback);
  elements.skipBackBtn.addEventListener('click', () => seekRelative(-5));
  elements.skipForwardBtn.addEventListener('click', () => seekRelative(5));
  elements.speedBtn.addEventListener('click', cyclePlaybackSpeed);
  elements.downloadAudioBtn.addEventListener('click', downloadCurrentAudio);
  elements.clearHistoryBtn.addEventListener('click', clearHistory);

  // Audio Timeline Scrubbing
  elements.progressBar.addEventListener('click', handleSeekClick);

  // Native Audio Event Listeners
  elements.nativeAudio.addEventListener('timeupdate', updateAudioProgress);
  elements.nativeAudio.addEventListener('ended', onAudioEnded);
  elements.nativeAudio.addEventListener('play', () => {
    setPlaybackState(true);
  });
  elements.nativeAudio.addEventListener('pause', () => {
    setPlaybackState(false);
  });
  elements.nativeAudio.addEventListener('loadedmetadata', () => {
    elements.totalDuration.textContent = formatTime(elements.nativeAudio.duration);
  });

  // API Key Modal Handlers
  elements.apiKeyModalBtn.addEventListener('click', openApiKeyModal);
  elements.closeModalBtn.addEventListener('click', closeApiKeyModal);
  elements.apiKeyModal.addEventListener('click', (e) => {
    if (e.target === elements.apiKeyModal) closeApiKeyModal();
  });

  elements.toggleApiKeyVis.addEventListener('click', toggleApiKeyVisibility);
  elements.saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
  elements.verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
  elements.clearApiKeyBtn.addEventListener('click', handleClearApiKey);
  elements.demoAudioBtn.addEventListener('click', handleDemoSpeech);
}

// ============================================================================
// Text Stats & Helpers
// ============================================================================
function updateTextCounters() {
  const text = elements.textInput.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  
  // Approximate speech speed: ~150 words per minute (2.5 words per second)
  const estSec = Math.round(words / 2.5);
  
  elements.charCount.textContent = chars.toLocaleString();
  elements.wordCount.textContent = words.toLocaleString();
  elements.estTime.textContent = `~${estSec}s`;
}

function updateModelDescription() {
  const modelId = elements.modelSelect.value;
  elements.modelDescription.textContent = MODEL_DESCRIPTIONS[modelId] || 'Selected ElevenLabs AI model.';
}

function formatTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// ============================================================================
// API Key Management & Verification
// ============================================================================
function updateApiStatusIndicator() {
  if (state.apiKey && state.apiKey.trim().length > 5) {
    elements.apiStatusDot.classList.add('connected');
    elements.apiStatusText.textContent = 'API Key Active';
  } else {
    elements.apiStatusDot.classList.remove('connected');
    elements.apiStatusText.textContent = 'Configure API Key';
  }
}

function openApiKeyModal() {
  elements.apiKeyInput.value = state.apiKey;
  elements.apiKeyVerificationMsg.classList.add('hidden');
  elements.apiKeyModal.classList.remove('hidden');
  elements.apiKeyInput.focus();
}

function closeApiKeyModal() {
  elements.apiKeyModal.classList.add('hidden');
}

function toggleApiKeyVisibility() {
  const isPassword = elements.apiKeyInput.type === 'password';
  elements.apiKeyInput.type = isPassword ? 'text' : 'password';
  elements.eyeIconOpen.classList.toggle('hidden', isPassword);
  elements.eyeIconClosed.classList.toggle('hidden', !isPassword);
}

function handleSaveApiKey() {
  const key = elements.apiKeyInput.value.trim();
  state.apiKey = key;
  if (key) {
    localStorage.setItem('elevenlabs_api_key', key);
    showToast('ElevenLabs API Key saved locally', 'success');
  } else {
    localStorage.removeItem('elevenlabs_api_key');
    showToast('API Key cleared', 'info');
  }
  updateApiStatusIndicator();
  closeApiKeyModal();
}

function handleClearApiKey() {
  elements.apiKeyInput.value = '';
  state.apiKey = '';
  localStorage.removeItem('elevenlabs_api_key');
  updateApiStatusIndicator();
  showToast('API Key removed', 'info');
  closeApiKeyModal();
}

async function handleVerifyApiKey() {
  const key = elements.apiKeyInput.value.trim();
  if (!key) {
    showVerificationMessage('Please enter an API key to test.', 'error');
    return;
  }

  showVerificationMessage('Verifying connection with ElevenLabs API...', 'info');

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': key }
    });

    if (res.ok) {
      const data = await res.json();
      const characterCount = data.subscription ? `${data.subscription.character_count?.toLocaleString()} / ${data.subscription.character_limit?.toLocaleString()}` : 'Active';
      showVerificationMessage(`Connected! Plan: ${data.subscription?.tier || 'Free'}. Characters used: ${characterCount}`, 'success');
      state.apiKey = key;
      localStorage.setItem('elevenlabs_api_key', key);
      updateApiStatusIndicator();
    } else {
      const err = await res.json().catch(() => ({}));
      const msg = err.detail?.message || err.detail || 'Invalid API key or unauthorized.';
      showVerificationMessage(`Verification failed: ${msg}`, 'error');
    }
  } catch (err) {
    showVerificationMessage(`Network error connecting to ElevenLabs: ${err.message}`, 'error');
  }
}

function showVerificationMessage(msg, type) {
  elements.apiKeyVerificationMsg.textContent = msg;
  elements.apiKeyVerificationMsg.className = `verification-box ${type}`;
  elements.apiKeyVerificationMsg.classList.remove('hidden');
}

function handleDemoSpeech() {
  const text = elements.textInput.value.trim() || 'Welcome to the ElevenLabs Voice Studio demo preview.';
  closeApiKeyModal();

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = state.playbackSpeed;

    utterance.onstart = () => {
      setPlaybackState(true);
      elements.playbackBadgeText.textContent = 'Demo Voice';
      showToast('Playing demo narration with browser voice engine (no API key required)', 'info');
    };

    utterance.onend = () => {
      setPlaybackState(false);
      showToast('Demo preview finished', 'info');
    };

    utterance.onerror = (e) => {
      setPlaybackState(false);
      showToast('Demo speech playback interrupted', 'warning');
    };

    window.speechSynthesis.speak(utterance);
  } else {
    showToast('Browser speech synthesis is not supported on this browser.', 'warning');
  }
}

// ============================================================================
// Fetch Account Voices
// ============================================================================
async function fetchAccountVoices() {
  if (!state.apiKey) {
    openApiKeyModal();
    showToast('Please configure your ElevenLabs API Key first.', 'warning');
    return;
  }

  const btn = elements.refreshVoicesBtn;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span>Fetching...</span>';
  btn.style.pointerEvents = 'none';

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': state.apiKey }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch voices (${res.status})`);
    }

    const data = await res.json();
    const voices = data.voices || [];

    if (voices.length > 0) {
      // Rebuild select with custom & premade voices
      elements.voiceSelect.innerHTML = '';
      
      const premadeGroup = document.createElement('optgroup');
      premadeGroup.label = 'Default / Premade Voices';

      const customGroup = document.createElement('optgroup');
      customGroup.label = 'Your Cloned / Custom Voices';

      voices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voice_id;
        opt.textContent = `${v.name} (${v.category || 'voice'})`;

        if (v.category === 'cloned' || v.category === 'generated') {
          customGroup.appendChild(opt);
        } else {
          premadeGroup.appendChild(opt);
        }
      });

      if (customGroup.children.length > 0) {
        elements.voiceSelect.appendChild(customGroup);
      }
      elements.voiceSelect.appendChild(premadeGroup);

      // Add Custom Voice option
      const manualGroup = document.createElement('optgroup');
      manualGroup.label = 'Manual';
      const manualOpt = document.createElement('option');
      manualOpt.value = 'custom';
      manualOpt.textContent = 'Enter Custom Voice ID...';
      manualGroup.appendChild(manualOpt);
      elements.voiceSelect.appendChild(manualGroup);

      showToast(`Loaded ${voices.length} voices from ElevenLabs account!`, 'success');
    }
  } catch (err) {
    showToast(`Could not load voices: ${err.message}`, 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.style.pointerEvents = 'auto';
  }
}

// ============================================================================
// ElevenLabs Narration Generation & Playback
// ============================================================================
async function handleGenerateAndPlay() {
  const text = elements.textInput.value.trim();
  if (!text) {
    showToast('Please enter text to narrate.', 'warning');
    elements.textInput.focus();
    return;
  }

  // Check API Key
  if (!state.apiKey) {
    openApiKeyModal();
    showToast('Please enter your ElevenLabs API Key to generate narration.', 'warning');
    return;
  }

  // Determine Voice ID
  let voiceId = elements.voiceSelect.value;
  let voiceName = elements.voiceSelect.options[elements.voiceSelect.selectedIndex].text.split('(')[0].trim();

  if (voiceId === 'custom') {
    voiceId = elements.customVoiceId.value.trim();
    if (!voiceId) {
      showToast('Please enter a valid Custom Voice ID.', 'warning');
      elements.customVoiceId.focus();
      return;
    }
    voiceName = `Custom (${voiceId.slice(0, 6)}...)`;
  }

  const modelId = elements.modelSelect.value;
  const stability = parseFloat(elements.stabilityRange.value);
  const similarityBoost = parseFloat(elements.similarityRange.value);
  const style = parseFloat(elements.styleRange.value);
  const speakerBoost = elements.speakerBoostToggle.checked;

  // Set Generation UI State
  setGenerating(true);
  elements.activeModelPill.textContent = 'Generating...';

  try {
    const payload = {
      text: text,
      model_id: modelId,
      voice_settings: {
        stability: stability,
        similarity_boost: similarityBoost,
        style: style,
        use_speaker_boost: speakerBoost
      }
    };

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': state.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMessage = `ElevenLabs API Error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.detail && errorData.detail.message) {
          errorMessage = errorData.detail.message;
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
      } catch {
        // Response wasn't JSON
      }
      throw new Error(errorMessage);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Update Take Metadata
    const takeMeta = {
      id: Date.now(),
      textSnippet: text.length > 50 ? text.slice(0, 50) + '...' : text,
      fullText: text,
      modelId: modelId,
      voiceId: voiceId,
      voiceName: voiceName,
      blob: audioBlob,
      url: audioUrl,
      sizeKb: (audioBlob.size / 1024).toFixed(1),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    state.currentAudioUrl = audioUrl;
    state.currentAudioBlob = audioBlob;
    state.currentTakeMeta = takeMeta;

    // Load and Play Audio
    loadAudioIntoPlayer(takeMeta);
    addHistoryItem(takeMeta);

    showToast('Narration generated successfully! Playing now.', 'success');
  } catch (error) {
    console.error('TTS Generation error:', error);
    showToast(error.message, 'error');
    elements.activeModelPill.textContent = 'Error';
  } finally {
    setGenerating(false);
  }
}

function setGenerating(isGenerating) {
  if (isGenerating) {
    elements.playBtn.disabled = true;
    elements.playBtnSpinner.classList.remove('hidden');
    elements.playBtnText.textContent = 'Synthesizing Audio...';
    elements.playBtnIcon.classList.add('hidden');
  } else {
    elements.playBtn.disabled = false;
    elements.playBtnSpinner.classList.add('hidden');
    elements.playBtnText.textContent = 'Generate & Play Narration';
    elements.playBtnIcon.classList.remove('hidden');
  }
}

// ============================================================================
// Audio Player Controls & Web Audio Integration
// ============================================================================
function loadAudioIntoPlayer(takeMeta) {
  elements.nativeAudio.src = takeMeta.url;
  elements.nativeAudio.playbackRate = state.playbackSpeed;

  // Enable controls
  elements.deckPlayPauseBtn.disabled = false;
  elements.skipBackBtn.disabled = false;
  elements.skipForwardBtn.disabled = false;
  elements.downloadAudioBtn.disabled = false;

  // Update Take Details
  elements.takeVoiceName.textContent = takeMeta.voiceName;
  elements.takeModelName.textContent = takeMeta.modelId;
  elements.takeAudioSize.textContent = `${takeMeta.sizeKb} KB`;
  elements.takeDetails.classList.remove('hidden');
  elements.activeModelPill.textContent = takeMeta.modelId;

  // Setup Web Audio Node
  setupWebAudio();

  // Play audio
  elements.nativeAudio.play().then(() => {
    setPlaybackState(true);
  }).catch((err) => {
    console.warn('Playback autoplay blocked:', err);
    setPlaybackState(false);
  });
}

function setupWebAudio() {
  if (!state.audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new AudioContextClass();
  }

  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }

  if (!state.sourceNode) {
    try {
      state.analyser = state.audioCtx.createAnalyser();
      state.analyser.fftSize = 128;
      state.analyser.smoothingTimeConstant = 0.8;

      state.sourceNode = state.audioCtx.createMediaElementSource(elements.nativeAudio);
      state.sourceNode.connect(state.analyser);
      state.analyser.connect(state.audioCtx.destination);
    } catch (e) {
      console.log('Web audio context node connection note:', e);
    }
  }
}

function togglePlayback() {
  if (!elements.nativeAudio.src) return;

  if (elements.nativeAudio.paused) {
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
    elements.nativeAudio.play();
  } else {
    elements.nativeAudio.pause();
  }
}

function setPlaybackState(isPlaying) {
  state.isPlaying = isPlaying;

  if (isPlaying) {
    elements.deckPlayIcon.classList.add('hidden');
    elements.deckPauseIcon.classList.remove('hidden');
    elements.visualizerIdleState.style.opacity = '0';
    elements.playbackBadge.classList.remove('hidden');
    elements.playbackBadgeText.textContent = 'Speaking';
  } else {
    elements.deckPlayIcon.classList.remove('hidden');
    elements.deckPauseIcon.classList.add('hidden');
    elements.visualizerIdleState.style.opacity = '1';
    elements.playbackBadge.classList.add('hidden');
  }
}

function onAudioEnded() {
  setPlaybackState(false);
  elements.progressFilled.style.width = '0%';
  elements.progressScrubber.style.left = '0%';
  elements.currentTime.textContent = '0:00';
}

function updateAudioProgress() {
  const current = elements.nativeAudio.currentTime;
  const duration = elements.nativeAudio.duration;

  if (!isNaN(duration) && duration > 0) {
    const percent = (current / duration) * 100;
    elements.progressFilled.style.width = `${percent}%`;
    elements.progressScrubber.style.left = `${percent}%`;
    elements.currentTime.textContent = formatTime(current);
    elements.totalDuration.textContent = formatTime(duration);
  }
}

function handleSeekClick(e) {
  const rect = elements.progressBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const seekFraction = Math.max(0, Math.min(1, clickX / width));

  if (!isNaN(elements.nativeAudio.duration) && elements.nativeAudio.duration > 0) {
    elements.nativeAudio.currentTime = seekFraction * elements.nativeAudio.duration;
  }
}

function seekRelative(seconds) {
  if (!isNaN(elements.nativeAudio.duration)) {
    elements.nativeAudio.currentTime = Math.max(0, Math.min(elements.nativeAudio.duration, elements.nativeAudio.currentTime + seconds));
  }
}

function cyclePlaybackSpeed() {
  const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
  const currentIndex = speeds.indexOf(state.playbackSpeed);
  const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
  state.playbackSpeed = nextSpeed;
  elements.nativeAudio.playbackRate = nextSpeed;
  elements.speedBtn.textContent = `${nextSpeed.toFixed(2).replace(/\.00$/, '.0').replace(/\.50$/, '.5')}x`;
  showToast(`Speed set to ${elements.speedBtn.textContent}`, 'info');
}

function downloadCurrentAudio() {
  if (!state.currentAudioBlob) return;
  const a = document.createElement('a');
  a.href = state.currentAudioUrl;
  const safeName = (state.currentTakeMeta?.voiceName || 'elevenlabs').toLowerCase().replace(/[^a-z0-9]/g, '-');
  a.download = `elevenlabs-narration-${safeName}-${Date.now()}.mp3`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Audio MP3 downloaded!', 'success');
}

// ============================================================================
// Waveform Visualizer (Canvas Animation)
// ============================================================================
function initVisualizer() {
  const canvas = elements.visualizerCanvas;
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let phase = 0;

  function render() {
    const width = canvas.parentElement.clientWidth;
    const height = canvas.parentElement.clientHeight;

    ctx.clearRect(0, 0, width, height);

    if (state.isPlaying && state.analyser) {
      // Live frequency bar visualization
      const bufferLength = state.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      state.analyser.getByteFrequencyData(dataArray);

      const numBars = 48;
      const barWidth = (width / numBars) - 3;
      const centerY = height / 2;

      for (let i = 0; i < numBars; i++) {
        // Sample frequency values
        const dataIndex = Math.floor((i / numBars) * bufferLength * 0.75);
        const value = dataArray[dataIndex] || 0;
        const barHeight = Math.max(4, (value / 255) * (height * 0.8));

        const x = i * (barWidth + 3) + 2;
        const y = centerY - barHeight / 2;

        // Dynamic gradient for each bar
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#818cf8');
        gradient.addColorStop(0.5, '#c084fc');
        gradient.addColorStop(1, '#06b6d4');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, 3);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }
    } else {
      // Idle gentle undulating wave line
      phase += 0.03;
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';

      const centerY = height / 2;
      for (let x = 0; x < width; x += 5) {
        const y = centerY + Math.sin(x * 0.02 + phase) * 8 * Math.cos(x * 0.01 + phase * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    requestAnimationFrame(render);
  }

  render();
}

// ============================================================================
// Narration Takes History
// ============================================================================
function addHistoryItem(takeMeta) {
  state.history.unshift(takeMeta);
  renderHistory();
}

function renderHistory() {
  elements.historyCount.textContent = state.history.length;
  elements.historyList.innerHTML = '';

  if (state.history.length === 0) {
    elements.historyList.innerHTML = `
      <div class="empty-history">
        <span>No audio generated yet. Write something and press Generate!</span>
      </div>`;
    return;
  }

  state.history.forEach((item) => {
    const div = document.createElement('div');
    div.className = `history-item ${state.currentTakeMeta?.id === item.id ? 'active' : ''}`;
    div.innerHTML = `
      <div class="history-item-left">
        <span class="history-item-snippet">${item.textSnippet}</span>
        <div class="history-item-meta">
          <span>${item.voiceName}</span> &bull; 
          <span>${item.modelId}</span> &bull; 
          <span>${item.timestamp}</span>
        </div>
      </div>
      <div class="history-play-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
    `;

    div.addEventListener('click', () => {
      state.currentAudioUrl = item.url;
      state.currentAudioBlob = item.blob;
      state.currentTakeMeta = item;
      loadAudioIntoPlayer(item);
      renderHistory();
    });

    elements.historyList.appendChild(div);
  });
}

function clearHistory() {
  state.history = [];
  renderHistory();
  showToast('Takes history cleared', 'info');
}

// ============================================================================
// Toast Notification Center
// ============================================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  }[type] || '';

  toast.innerHTML = `
    <span>${iconSvg}</span>
    <span style="flex: 1; word-break: break-word;">${message}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => toast.remove(), 300);
  }, 4200);
}

// Start application
window.addEventListener('DOMContentLoaded', init);
