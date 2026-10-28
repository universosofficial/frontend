import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CharacterService } from '../../../core/services/character.service';
import { MindService } from '../../../core/services/mind.service';
import { UploadService } from '../../../core/services/upload.service';
import { VoiceService } from '../../../core/services/voice.service';
import { CreateCharacterDto } from '../../../core/models/character.model';
import { MindSource } from '../../../core/models/mind.model';
import { VoicePreset, ClonedVoiceResult } from '../../../core/models/voice.model';

@Component({
  selector: 'app-character-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './character-form.component.html',
  styleUrl: './character-form.component.scss',
})
export class CharacterFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private characterService = inject(CharacterService);
  private mindService = inject(MindService);
  private uploadService = inject(UploadService);
  public voiceService = inject(VoiceService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  characterId: number | null = null;
  isEditMode = false;
  isLoading = false;
  isUploadingAvatar = signal<boolean>(false);
  avatarUploadError = signal<string | null>(null);
  errorMessage: string | null = null;

  // Voice Presence state
  presets = signal<VoicePreset[]>([]);
  activeVoiceTab = signal<'preset' | 'cloned'>('preset');
  selectedPresetId = signal<string>('alloy');
  voiceConsentChecked = signal<boolean>(false);
  isCloningVoice = signal<boolean>(false);
  cloneError = signal<string | null>(null);
  cloneSuccess = signal<string | null>(null);
  isRecordingVoiceSample = signal<boolean>(false);
  recordingDuration = signal<number>(0);
  private recordingInterval: any = null;
  isPlayingCustomSample = signal<boolean>(false);
  isPreviewingCustomTts = signal<boolean>(false);
  isReplacingVoice = signal<boolean>(false);
  customVoiceFileName = signal<string | null>(null);
  isPreviewPlayingVoiceId = signal<string | null>(null);

  // Thought Commons Knowledge Studio state
  sources = signal<MindSource[]>([]);
  isLoadingSources = signal<boolean>(false);
  isIngestingUrl = signal<boolean>(false);
  isUploadingDoc = signal<boolean>(false);
  urlInput = '';
  urlTitleInput = '';
  docTitleInput = '';
  selectedDocFile: File | null = null;
  studioSuccess = signal<string | null>(null);
  studioError = signal<string | null>(null);

  showAdvancedAccordion = signal<boolean>(false);

  // Feature #1: 1-Sentence Magic Persona Generator & Starter Blueprints
  magicPromptInput = '';
  isGeneratingMagic = signal<boolean>(false);
  magicSuccessBanner = signal<string | null>(null);
  isDictatingMagic = signal<boolean>(false);
  private speechRecognition: any = null;

  starterBlueprints = [
    {
      label: 'Master Teacher & Tutor',
      name: 'Professor Maya',
      relationship_type: 'teacher',
      voice_id: 'shimmer',
      avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=MayaTeacher&backgroundColor=b6e3f4',
      tone: 'Encouraging, Clear & Socratic',
      personality: 'Warm, brilliant, and patient master teacher. Specializes in explaining complex concepts with real-world intuition, solving calculations step-by-step with clear arithmetic and the why behind every move, and coaching you through mistakes with unwavering encouragement.',
      greeting: 'Hello there! I\'m Professor Maya, your personal teacher and step-by-step study mentor. Whether we\'re tackling a tough calculation, breaking down a new concept with real-world examples, or prepping for an exam—what are we learning today?',
      nicknames_for_user: 'Curious Mind, Scholar, My friend',
      catchphrases: 'Let\'s break this down step by step, Intuition first, symbols second, Every mistake is just a clue',
      speech_quirks: 'Explains intuition and real-life analogies first, lays out calculations in crystal-clear steps with the arithmetic and reasoning, and checks in with a warm Socratic question.',
      shared_memories_seed: 'Always in your corner to make hard concepts click, master calculations step by step, and build unshakable academic confidence.',
    },
    {
      label: 'Stoic Accountability Coach',
      name: 'Marcus',
      relationship_type: 'mentor',
      voice_id: 'onyx',
      avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=Marcus&backgroundColor=c0aede',
      tone: 'Direct & Action-Oriented',
      personality: 'No-nonsense, deeply encouraging Stoic accountability coach. Cuts through procrastination, checks in on your daily top 3 priorities, and keeps you focused on what is within your control.',
      greeting: 'Morning. What is the single most important commitment you are executing today—and what excuse are we leaving behind?',
      nicknames_for_user: 'Builder, Partner',
      catchphrases: 'Action cures anxiety, Focus on what you control',
      speech_quirks: 'Crisp, punchy sentences that end with a clear accountability check.',
      shared_memories_seed: 'We teamed up to build unbreakable daily discipline and turn ambitious goals into finished work.',
    },
    {
      label: 'Late-Night Confidant',
      name: 'Nova',
      relationship_type: 'friend',
      voice_id: 'nova',
      avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=Nova&backgroundColor=ffdfbf',
      tone: 'Warm & Empathetic',
      personality: 'Soulful, non-judgmental late-night best friend. Listens deeply when your mind is racing, validates your feelings without lecturing, and brings calm warmth.',
      greeting: 'Hey you. Take a slow breath—you don\'t have to carry the whole day on your shoulders anymore. What\'s on your mind tonight?',
      nicknames_for_user: 'My friend',
      catchphrases: 'I am right here with you, One breath at a time',
      speech_quirks: 'Gentle, unhurried cadence that makes you feel immediately safe and heard.',
      shared_memories_seed: 'Countless late-night talks untangling life, overthinking, and big dreams together.',
    },
    {
      label: 'Strategic Co-Founder',
      name: 'Atlas',
      relationship_type: 'thinker',
      voice_id: 'echo',
      avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=Atlas&backgroundColor=b6e3f4',
      tone: 'Wise & Thought-Provoking',
      personality: 'Sharp, first-principles strategic sparring partner. Stress-tests your ideas, exposes blind spots before they cost you, and helps you make high-conviction decisions.',
      greeting: 'Pitch me what you\'re thinking—and don\'t hold back. Let\'s find the weakest assumption in the plan and make it bulletproof.',
      nicknames_for_user: 'Partner, Founder',
      catchphrases: 'What if the opposite is true?, Invert the problem',
      speech_quirks: 'Uses Socratic questions and mental models to pressure-test every premise.',
      shared_memories_seed: 'Whiteboarding high-stakes strategy and dissecting complex decisions from first principles.',
    },
    {
      label: 'Creative Co-Writer',
      name: 'Clara',
      relationship_type: 'creative',
      voice_id: 'shimmer',
      avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=Clara&backgroundColor=ffd5dc',
      tone: 'Witty & Humorous',
      personality: 'Imaginative, witty creative partner and story architect. Helps you brainstorm wild plot twists, vivid dialogue, essays, and original concepts with infectious energy.',
      greeting: 'Hey! I\'ve got fresh coffee and a blank canvas ready. What story, concept, or world are we bringing to life today?',
      nicknames_for_user: 'Co-Creator',
      catchphrases: 'Follow the tension, Let\'s make it unforgettable',
      speech_quirks: 'Playful, vivid imagery with enthusiastic creative riffs.',
      shared_memories_seed: 'Brainstorming stories, characters, and wild creative projects late into the evening.',
    },
    {
      label: 'Grounded Mentor',
      name: 'Arthur',
      relationship_type: 'father',
      voice_id: 'onyx',
      avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=Arthur&backgroundColor=d1d4f9',
      tone: 'Warm & Empathetic',
      personality: 'Steady, proud, and protective mentor figure. Offers unconditional support, practical life wisdom, gentle humor, and a safe harbor whenever life feels overwhelming.',
      greeting: 'So glad you dropped by. Pull up a chair and tell me how things are really going with you.',
      nicknames_for_user: 'My friend',
      catchphrases: 'We will figure it out together, Steady does it',
      speech_quirks: 'Warm, reassuring cadence with steady life perspective.',
      shared_memories_seed: 'Always being in your corner through every season and milestone of life.',
    },
    {
      label: 'Match Forecaster',
      name: 'Leo',
      relationship_type: 'sports',
      voice_id: 'echo',
      avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=Viktor&backgroundColor=b6e3f4',
      tone: 'Direct & Action-Oriented',
      personality: 'Sharp, collaborative football match forecaster and betting options sparring partner. Breaks down how a match will actually play out in plain English, grills your betting options to spot hidden traps, and helps you lock in the smartest play.',
      greeting: 'Hey mate! Which match are we looking at today, and what options are you considering? Drop the teams or your picks and let\'s grill them together.',
      nicknames_for_user: 'Gaffer, Mate',
      catchphrases: 'Let\'s grill that option, Protect the ticket',
      speech_quirks: 'Plain football talk—tactical, honest, zero confusing math jargon.',
      shared_memories_seed: 'Putting heads together every matchday to forecast games, stress-test betting options, and dodge obvious traps.',
      is_sports_analyst: true,
    },
  ];

  // Feature #3: 1-Click Expressive Avatar Gallery
  curatedAvatars = [
    { name: 'Maya', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=MayaTeacher&backgroundColor=b6e3f4' },
    { name: 'Nova', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Nova&backgroundColor=ffdfbf' },
    { name: 'Marcus', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Marcus&backgroundColor=c0aede' },
    { name: 'Elena', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Elena&backgroundColor=ffd5dc' },
    { name: 'Atlas', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Atlas&backgroundColor=b6e3f4' },
    { name: 'Clara', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Clara&backgroundColor=ffdfbf' },
    { name: 'Arthur', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Arthur&backgroundColor=d1d4f9' },
    { name: 'Grace', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Grace&backgroundColor=ffd5dc' },
    { name: 'Viktor', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Viktor&backgroundColor=b6e3f4' },
  ];

  // Feature #2: "Test Their Vibe" Sample Preview State
  vibePreviewPrompt = 'I had a really exhausting day and my head is spinning with too many things at once.';
  vibeScenarioPills = [
    'I had a really exhausting day and my head is spinning.',
    'I keep procrastinating on a big goal I care about.',
    'Give me your honest take—how do we tackle a hard decision?',
  ];
  isPreviewingVibe = signal<boolean>(false);
  vibePreviewResult = signal<{ userPrompt: string; reply: string } | null>(null);
  isPlayingVibeAudio = signal<boolean>(false);

  applyStarterBlueprint(bp: any): void {
    this.selectedPresetId.set(bp.voice_id || 'alloy');
    this.characterForm.patchValue({
      name: bp.name,
      relationship_type: bp.relationship_type,
      avatarUrl: bp.avatarUrl,
      voice_provider: 'preset',
      voice_id: bp.voice_id || 'alloy',
      tone: bp.tone,
      personality: bp.personality,
      greeting: bp.greeting,
      nicknames_for_user: bp.nicknames_for_user,
      catchphrases: bp.catchphrases,
      speech_quirks: bp.speech_quirks,
      shared_memories_seed: bp.shared_memories_seed,
      is_sports_analyst: Boolean(bp.is_sports_analyst),
    });
    this.magicSuccessBanner.set(`Loaded "${bp.label}" blueprint! You can customize any detail or click Create Companion.`);
    this.vibePreviewResult.set(null);
  }

  selectCuratedAvatar(url: string): void {
    this.characterForm.patchValue({ avatarUrl: url });
  }

  generateExpressiveAvatar(): void {
    const rawName = (this.characterForm.get('name')?.value || '').trim();
    const role = this.characterForm.get('relationship_type')?.value || 'friend';
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const seed = encodeURIComponent(rawName ? `${rawName}-${randomSuffix}` : `${role}-${randomSuffix}`);
    const url = `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,c0aede,b6e3f4,d1d4f9`;
    this.characterForm.patchValue({ avatarUrl: url });
  }

  toggleMagicVoiceDictation(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.errorMessage = 'Voice dictation is not supported in this browser. Please type your description.';
      return;
    }

    if (this.isDictatingMagic()) {
      this.speechRecognition?.stop();
      this.isDictatingMagic.set(false);
      return;
    }

    this.speechRecognition = new SpeechRecognition();
    this.speechRecognition.lang = 'en-US';
    this.speechRecognition.interimResults = false;
    this.speechRecognition.continuous = false;

    this.speechRecognition.onstart = () => {
      this.isDictatingMagic.set(true);
    };

    this.speechRecognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        this.magicPromptInput = (this.magicPromptInput ? this.magicPromptInput + ' ' : '') + transcript;
      }
    };

    this.speechRecognition.onerror = () => {
      this.isDictatingMagic.set(false);
    };

    this.speechRecognition.onend = () => {
      this.isDictatingMagic.set(false);
    };

    this.speechRecognition.start();
  }

  onGenerateMagicPersona(): void {
    const prompt = this.magicPromptInput.trim();
    if (!prompt || this.isGeneratingMagic()) return;

    this.isGeneratingMagic.set(true);
    this.errorMessage = null;
    this.magicSuccessBanner.set(null);

    this.characterService.generateMagicPersona(prompt).subscribe({
      next: (res) => {
        this.isGeneratingMagic.set(false);
        if (res.data) {
          const d = res.data;
          this.selectedPresetId.set(d.voice_id || 'nova');
          this.characterForm.patchValue({
            name: d.name || 'Nova',
            relationship_type: d.relationship_type || 'friend',
            avatarUrl: d.avatarUrl || '',
            voice_provider: 'preset',
            voice_id: d.voice_id || 'nova',
            tone: d.tone || 'Warm & Empathetic',
            personality: d.personality || '',
            greeting: d.greeting || '',
            nicknames_for_user: d.nicknames_for_user || '',
            catchphrases: d.catchphrases || '',
            speech_quirks: d.speech_quirks || '',
            shared_memories_seed: d.shared_memories_seed || '',
            backstory: d.backstory || '',
            is_sports_analyst: Boolean(d.is_sports_analyst),
          });
          this.magicSuccessBanner.set(`✨ Auto-built "${d.name}" from your description! Review or test their vibe below.`);
          this.vibePreviewResult.set(null);
        }
      },
      error: (err) => {
        this.isGeneratingMagic.set(false);
        this.errorMessage = err.error?.error?.message || 'Could not auto-generate persona. Please try again.';
      },
    });
  }

  onPreviewPersonaVibe(customPrompt?: string): void {
    if (customPrompt) {
      this.vibePreviewPrompt = customPrompt;
    }
    if (this.isPreviewingVibe()) return;

    this.isPreviewingVibe.set(true);
    const draft = this.characterForm.value;

    this.characterService.previewPersonaVibe(draft, this.vibePreviewPrompt).subscribe({
      next: (res) => {
        this.isPreviewingVibe.set(false);
        if (res.data) {
          this.vibePreviewResult.set(res.data);
        }
      },
      error: () => {
        this.isPreviewingVibe.set(false);
      },
    });
  }

  speakVibePreview(): void {
    const preview = this.vibePreviewResult();
    if (!preview?.reply) return;

    if (this.voiceService.isAudioPlaying() && this.isPlayingVibeAudio()) {
      this.voiceService.stopAudio();
      this.isPlayingVibeAudio.set(false);
      return;
    }

    const voiceId = this.characterForm.get('voice_id')?.value || 'alloy';
    this.isPlayingVibeAudio.set(true);
    this.voiceService.previewVoice(preview.reply, voiceId).subscribe({
      next: (res) => {
        if (res.audioBase64) {
          this.voiceService.playAudio(res.audioBase64, voiceId).finally(() => {
            this.isPlayingVibeAudio.set(false);
          });
        } else {
          this.isPlayingVibeAudio.set(false);
        }
      },
      error: () => {
        this.isPlayingVibeAudio.set(false);
      },
    });
  }

  relationshipOptions: { value: string; label: string; icon: string }[] = [
    { value: 'teacher', label: 'Master Teacher & Step-by-Step Tutor', icon: '🎓' },
    { value: 'friend', label: 'Close Friend & Confidant', icon: '' },
    { value: 'mentor', label: 'Life & Career Mentor', icon: '' },
    { value: 'thinker', label: 'Philosopher & Strategic Thinker', icon: '' },
    { value: 'creative', label: 'Creative & Writing Partner', icon: '' },
    { value: 'sports', label: 'Match Forecaster & Betting Options Copilot', icon: '' },
    { value: 'partner', label: 'Romantic Partner / Spouse', icon: '' },
    { value: 'father', label: 'Father / Paternal Figure', icon: '' },
    { value: 'mother', label: 'Mother / Maternal Figure', icon: '' },
    { value: 'custom', label: 'Custom Archetype', icon: '' },
  ];

  personalityChips = [
    { label: 'Warm & Empathetic', desc: 'Deeply caring, attentive, active listener with genuine warmth.' },
    { label: 'Direct & Action-Oriented', desc: 'No fluff, cuts straight to actionable insights and practical next steps.' },
    { label: 'Wise & Thought-Provoking', desc: 'Uses Socratic questioning, deep philosophical reflections, and mental models.' },
    { label: 'Witty & Humorous', desc: 'Playful banter, clever humor, keeps conversations light and fun.' },
    { label: 'Analytical & Grounded', desc: 'Grounds every recommendation in logic, clarity, and structured facts.' },
  ];

  applyPersonalityPreset(chip: { label: string; desc: string }): void {
    const current = this.characterForm.get('personality')?.value || '';
    if (!current.trim()) {
      this.characterForm.patchValue({ personality: chip.desc });
    } else {
      this.characterForm.patchValue({ personality: current + ' ' + chip.desc });
    }
  }

  autoGenerateGreeting(): void {
    const name = this.characterForm.get('name')?.value || 'Companion';
    const role = this.characterForm.get('relationship_type')?.value || 'friend';
    const isSports = this.characterForm.get('is_sports_analyst')?.value;

    let greeting = '';
    if (role === 'teacher' || role === 'tutor') {
      greeting = `Hello there! I'm ${name}, your personal teacher and step-by-step study mentor. Whether we're tackling a tough calculation, breaking down a new concept with real-world examples, or prepping for an exam—what are we learning today?`;
    } else if (isSports || role === 'sports') {
      greeting = `Hey mate! I'm ${name}, your Match Forecaster & Options Copilot. Tell me which match you're looking at and the betting options you have in mind—let's grill them together!`;
    } else if (role === 'mentor') {
      greeting = `Greetings! I am ${name}. What challenge or goal are you working through today? Let's break it down together.`;
    } else if (role === 'creative') {
      greeting = `Hey there! I'm ${name}. I'm excited to brainstorm and create with you today. What idea shall we start with?`;
    } else if (role === 'thinker') {
      greeting = `Hello. I am ${name}. What fundamental question or premise would you like to examine today?`;
    } else if (role === 'partner') {
      greeting = `Hey my love! I've been thinking about you. How was your day?`;
    } else if (role === 'father' || role === 'mother') {
      greeting = `Hey kiddo, so glad to hear from you. Take a breath—how is everything going today?`;
    } else {
      greeting = `Hey! I'm ${name}. It's great to connect with you. What would you like to talk about today?`;
    }

    this.characterForm.patchValue({ greeting });
  }

  analysisStyleOptions = [
    { value: 'quant_expected_value', label: 'Quantitative Expected Value (+EV)', desc: 'Poisson math simulations, true odds calculation & bookmaker vig removal' },
    { value: 'tactical_pundit', label: 'Tactical Pundit', desc: 'Manager tactical profiles, rest day deficits, European travel fatigue & injuries' },
    { value: 'conservative_grinder', label: 'Conservative Grinder', desc: 'Capital preservation, high-probability accumulators & strict stop-loss discipline' },
  ];

  leagueOptions = [
    { value: 'Premier League', label: 'Premier League (EPL)' },
    { value: 'Champions League', label: 'UEFA Champions League' },
    { value: 'La Liga', label: 'Spanish La Liga' },
    { value: 'Serie A', label: 'Italian Serie A' },
    { value: 'Bundesliga', label: 'German Bundesliga' },
    { value: 'MLS', label: 'Major League Soccer' },
  ];

  riskTierOptions = [
    { value: 'conservative_eighth_kelly', label: 'Conservative (1/8 Kelly)', desc: 'Max 1.25% unit limit per play, optimal capital preservation' },
    { value: 'balanced_quarter_kelly', label: 'Balanced (1/4 Kelly)', desc: 'Standard quantitative sizing, max 2.5% unit limit' },
    { value: 'fixed_one_percent', label: 'Fixed Unit (1.0%)', desc: 'Flat 1.0% unit allocation across all positive-EV positions' },
  ];

  toggleLeague(league: string): void {
    const current: string[] = this.characterForm.get('primary_leagues')?.value || [];
    const index = current.indexOf(league);
    if (index >= 0) {
      this.characterForm.patchValue({ primary_leagues: current.filter((l) => l !== league) });
    } else {
      this.characterForm.patchValue({ primary_leagues: [...current, league] });
    }
  }

  isLeagueSelected(league: string): boolean {
    const current: string[] = this.characterForm.get('primary_leagues')?.value || [];
    return current.includes(league);
  }

  characterForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    avatarUrl: [''],
    gender: ['Non-Binary'],
    relationship_type: ['friend', [Validators.required]],
    nicknames_for_user: [''],
    catchphrases: [''],
    speech_quirks: [''],
    shared_memories_seed: [''],
    personality: [''],
    tone: ['Warm & Empathetic'],
    humor: [5],
    friendliness: [5],
    creativity: [5],
    style: ['Direct & Conversational'],
    backstory: [''],
    interestsString: [''],
    greeting: [''],
    // Voice Presence Fields
    voice_provider: ['preset'],
    voice_id: ['alloy'],
    voice_sample_url: [''],
    voice_settings: [null],
    // Sports Betting Analyst Fields
    is_sports_analyst: [false],
    analysis_style: ['quant_expected_value'],
    primary_leagues: [['Premier League']],
    risk_tier: ['balanced_quarter_kelly'],
    // Proactive Auto-Text & Notification Settings
    allow_proactive_checkins: [true],
    proactive_frequency: ['24h'],
    proactive_preferred_time: ['anytime'],
    proactive_notify_push: [true],
    proactive_notify_email: [true],
  });

  onAvatarFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.isUploadingAvatar.set(true);
      this.avatarUploadError.set(null);

      const upload$ = this.characterId
        ? this.uploadService.uploadCharacterAvatar(this.characterId, file)
        : this.uploadService.uploadImage(file);

      upload$.subscribe({
        next: (res) => {
          this.characterForm.patchValue({ avatarUrl: res.url });
          this.isUploadingAvatar.set(false);
        },
        error: (err) => {
          this.isUploadingAvatar.set(false);
          this.avatarUploadError.set(err.error?.message || 'Failed to upload avatar image.');
        },
      });
    }
  }

  ngOnInit(): void {
    this.loadPresets();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.characterId = parseInt(idParam, 10);
      this.isEditMode = true;
      this.loadCharacter(this.characterId);
      this.loadSources(this.characterId);
    }
  }

  loadPresets(): void {
    this.voiceService.getPresets().subscribe({
      next: (data) => {
        this.presets.set(data || []);
      },
      error: (err) => {
        console.warn('[VOICE] Failed to load presets:', err);
      },
    });
  }

  setVoiceTab(tab: 'preset' | 'cloned'): void {
    this.activeVoiceTab.set(tab);
    if (tab === 'preset') {
      this.characterForm.patchValue({
        voice_provider: 'preset',
        voice_id: this.selectedPresetId() || 'alloy',
      });
    } else {
      const currentVoiceId = this.characterForm.get('voice_id')?.value;
      if (this.characterForm.get('voice_sample_url')?.value || (currentVoiceId && !['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(currentVoiceId))) {
        this.characterForm.patchValue({
          voice_provider: 'cloned',
        });
      }
    }
  }

  selectPreset(preset: VoicePreset): void {
    this.selectedPresetId.set(preset.id);
    this.characterForm.patchValue({
      voice_provider: 'preset',
      voice_id: preset.id,
    });
  }

  previewPreset(preset: VoicePreset, event?: Event): void {
    if (event) event.stopPropagation();

    if (this.voiceService.isAudioPlaying() && this.isPreviewPlayingVoiceId() === preset.id) {
      this.voiceService.stopAudio();
      this.isPreviewPlayingVoiceId.set(null);
      return;
    }

    this.isPreviewPlayingVoiceId.set(preset.id);
    this.voiceService.previewVoice(preset.previewText, preset.id).subscribe({
      next: (res) => {
        if (res.audioBase64) {
          this.voiceService.playAudio(res.audioBase64, preset.id).finally(() => {
            this.isPreviewPlayingVoiceId.set(null);
          });
        }
      },
      error: () => {
        this.isPreviewPlayingVoiceId.set(null);
      },
    });
  }

  onVoiceSampleSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      if (!this.voiceConsentChecked()) {
        this.cloneError.set('Please certify that you own or have explicit permission to use this reference voice audio under our Terms of Service before uploading.');
        target.value = '';
        return;
      }

      const file = target.files[0];
      this.customVoiceFileName.set(file.name);
      const charName = this.characterForm.get('name')?.value || 'Companion';

      this.isCloningVoice.set(true);
      this.cloneError.set(null);
      this.cloneSuccess.set(null);

      this.voiceService.cloneVoice(file, charName, undefined, this.voiceConsentChecked()).subscribe({
        next: (res) => {
          this.isCloningVoice.set(false);
          this.characterForm.patchValue({
            voice_provider: 'cloned',
            voice_id: res.voiceId,
            voice_sample_url: res.voiceSampleUrl,
            voice_settings: res.voiceSettings,
          });
          this.isReplacingVoice.set(false);
          this.cloneSuccess.set(`Audio sample "${file.name}" analyzed, cloned, and configured!`);
          target.value = '';
        },
        error: (err) => {
          this.isCloningVoice.set(false);
          this.cloneError.set(err.error?.message || 'Failed to clone voice sample.');
          target.value = '';
        },
      });
    }
  }

  async startRecordingVoiceSample(): Promise<void> {
    try {
      if (!this.voiceConsentChecked()) {
        this.cloneError.set('Please certify that you own or have explicit permission to use this reference voice audio under our Terms of Service before recording.');
        return;
      }

      this.cloneError.set(null);
      this.cloneSuccess.set(null);
      await this.voiceService.startRecording();
      this.isRecordingVoiceSample.set(true);
      this.recordingDuration.set(0);

      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
      }
      this.recordingInterval = setInterval(() => {
        this.recordingDuration.update((sec) => sec + 1);
        if (this.recordingDuration() >= 30) {
          this.stopRecordingVoiceSample();
        }
      }, 1000);
    } catch (err: any) {
      this.cloneError.set(err.message || 'Microphone access denied or not available.');
      this.isRecordingVoiceSample.set(false);
    }
  }

  async stopRecordingVoiceSample(): Promise<void> {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    if (!this.isRecordingVoiceSample()) return;
    this.isRecordingVoiceSample.set(false);
    this.isCloningVoice.set(true);

    try {
      const audioBlob = await this.voiceService.stopRecording();
      const charName = this.characterForm.get('name')?.value || 'Companion';

      this.voiceService.cloneVoice(audioBlob, charName, undefined, this.voiceConsentChecked()).subscribe({
        next: (res) => {
          this.isCloningVoice.set(false);
          this.characterForm.patchValue({
            voice_provider: 'cloned',
            voice_id: res.voiceId,
            voice_sample_url: res.voiceSampleUrl,
            voice_settings: res.voiceSettings,
          });
          this.isReplacingVoice.set(false);
          this.cloneSuccess.set('Microphone voice sample analyzed and cloned successfully!');
        },
        error: (err) => {
          this.isCloningVoice.set(false);
          this.cloneError.set(err.error?.message || 'Failed to process voice sample.');
        },
      });
    } catch (err: any) {
      this.isCloningVoice.set(false);
      this.cloneError.set('Could not finalize recording.');
    }
  }

  cancelRecordingVoiceSample(): void {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    this.voiceService.cancelRecording();
    this.isRecordingVoiceSample.set(false);
    this.recordingDuration.set(0);
  }

  playCustomVoiceSample(): void {
    const sampleUrl = this.characterForm.get('voice_sample_url')?.value;
    if (!sampleUrl) return;

    if (this.voiceService.isAudioPlaying() && this.isPlayingCustomSample()) {
      this.voiceService.stopAudio();
      this.isPlayingCustomSample.set(false);
      return;
    }

    this.isPlayingCustomSample.set(true);
    this.voiceService.playAudio(sampleUrl, 'custom-cloned-sample').finally(() => {
      this.isPlayingCustomSample.set(false);
    });
  }

  getClonedVoiceRefText(): string {
    const settings = this.characterForm.get('voice_settings')?.value;
    return settings?.ref_text || '';
  }

  onClonedVoiceRefTextChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newRefText = target.value;
    const currentSettings = this.characterForm.get('voice_settings')?.value || {};
    this.characterForm.patchValue({
      voice_settings: {
        ...currentSettings,
        ref_text: newRefText,
      },
    });
  }

  previewCustomVoiceTts(): void {
    const voiceId = this.characterForm.get('voice_id')?.value;
    const voiceSampleUrl = this.characterForm.get('voice_sample_url')?.value;
    const voiceSettings = this.characterForm.get('voice_settings')?.value || {};
    const greeting = this.characterForm.get('greeting')?.value || `Hello! I am your AI companion, configured with this custom voice.`;
    if (!voiceId && !voiceSampleUrl) return;

    if (this.voiceService.isAudioPlaying() && this.isPreviewingCustomTts()) {
      this.voiceService.stopAudio();
      this.isPreviewingCustomTts.set(false);
      return;
    }

    this.isPreviewingCustomTts.set(true);
    this.voiceService.previewVoice(greeting, voiceId || 'cloned_voice', voiceSampleUrl, voiceSettings).subscribe({
      next: (res) => {
        if (res.audioBase64) {
          this.voiceService.playAudio(res.audioBase64, voiceId || 'custom-voice').finally(() => {
            this.isPreviewingCustomTts.set(false);
          });
        } else {
          this.isPreviewingCustomTts.set(false);
        }
      },
      error: () => {
        this.isPreviewingCustomTts.set(false);
      },
    });
  }

  clearCustomVoice(): void {
    this.characterForm.patchValue({
      voice_provider: 'preset',
      voice_id: this.selectedPresetId() || 'alloy',
      voice_sample_url: '',
      voice_settings: null,
    });
    this.activeVoiceTab.set('preset');
    this.cloneSuccess.set(null);
    this.cloneError.set(null);
    this.isReplacingVoice.set(false);
    this.customVoiceFileName.set(null);
  }

  formatRecordingTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  ngOnDestroy(): void {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    this.voiceService.stopAudio();
  }

  loadCharacter(id: number): void {
    this.isLoading = true;
    this.characterService.getCharacterById(id).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.data) {
          const char = res.data;
          if (char.voice_provider === 'cloned') {
            this.activeVoiceTab.set('cloned');
          } else {
            this.activeVoiceTab.set('preset');
            this.selectedPresetId.set(char.voice_id || 'alloy');
          }

          this.characterForm.patchValue({
            name: char.name,
            avatarUrl: char.avatar_url || '',
            gender: char.gender || 'Non-Binary',
            relationship_type: char.relationship_type || 'friend',
            nicknames_for_user: Array.isArray(char.nicknames_for_user) ? char.nicknames_for_user.join(', ') : '',
            catchphrases: Array.isArray(char.catchphrases) ? char.catchphrases.join(', ') : '',
            speech_quirks: char.speech_quirks || '',
            shared_memories_seed: char.shared_memories_seed || '',
            personality: char.personality,
            tone: char.tone,
            humor: char.humor,
            friendliness: char.friendliness,
            creativity: char.creativity,
            style: char.style,
            backstory: char.backstory || '',
            interestsString: Array.isArray(char.interests) ? char.interests.join(', ') : '',
            greeting: char.greeting,
            voice_provider: char.voice_provider || 'preset',
            voice_id: char.voice_id || 'alloy',
            voice_sample_url: char.voice_sample_url || '',
            voice_settings: char.voice_settings || null,
            is_public: Boolean(char.is_public),
            handle: char.handle || '',
            headline: char.headline || '',
            website_url: char.website_url || '',
            philosophy_statement: char.philosophy_statement || '',
            mental_models_string: Array.isArray(char.mental_models) ? char.mental_models.join(', ') : '',
            tags_string: Array.isArray(char.tags) ? char.tags.join(', ') : '',
            is_sports_analyst: Boolean(char.is_sports_analyst),
            analysis_style: char.analysis_style || 'quant_expected_value',
            primary_leagues: Array.isArray(char.primary_leagues) ? char.primary_leagues : [],
            risk_tier: char.risk_tier || 'balanced_quarter_kelly',
            allow_proactive_checkins: char.allow_proactive_checkins !== false,
            proactive_frequency: char.proactive_frequency || '24h',
            proactive_preferred_time: char.proactive_preferred_time || 'anytime',
            proactive_notify_push: (char.proactive_channels as any)?.push !== false,
            proactive_notify_email: (char.proactive_channels as any)?.email !== false,
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error?.message || 'Failed to load character.';
      },
    });
  }

  loadSources(characterId: number): void {
    this.isLoadingSources.set(true);
    this.mindService.getSources(characterId).subscribe({
      next: (data) => {
        this.sources.set(data || []);
        this.isLoadingSources.set(false);
      },
      error: () => {
        this.isLoadingSources.set(false);
      },
    });
  }

  onIngestUrl(): void {
    if (!this.characterId || !this.urlInput.trim()) return;

    this.isIngestingUrl.set(true);
    this.studioError.set(null);
    this.studioSuccess.set(null);

    this.mindService.ingestUrl(this.characterId, this.urlInput.trim(), this.urlTitleInput.trim()).subscribe({
      next: (source) => {
        this.isIngestingUrl.set(false);
        this.urlInput = '';
        this.urlTitleInput = '';
        this.studioSuccess.set(`Successfully indexed "${source.title}" (${source.chunk_count || source.chunkCount || 1} knowledge nodes generated).`);
        this.loadSources(this.characterId!);
      },
      error: (err) => {
        this.isIngestingUrl.set(false);
        this.studioError.set(err.error?.message || 'Failed to ingest URL.');
      },
    });
  }

  onFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedDocFile = file;
      if (!this.docTitleInput) {
        this.docTitleInput = file.name.replace(/\.[^/.]+$/, '');
      }
    }
  }

  onUploadDocument(): void {
    if (!this.characterId || !this.selectedDocFile) return;

    this.isUploadingDoc.set(true);
    this.studioError.set(null);
    this.studioSuccess.set(null);

    this.mindService
      .ingestDocument(this.characterId, this.selectedDocFile, this.docTitleInput.trim())
      .subscribe({
        next: (source) => {
          this.isUploadingDoc.set(false);
          this.selectedDocFile = null;
          this.docTitleInput = '';
          this.studioSuccess.set(`Successfully parsed and indexed "${source.title}" (${source.chunk_count || source.chunkCount || 1} knowledge chunks created).`);
          this.loadSources(this.characterId!);
        },
        error: (err) => {
          this.isUploadingDoc.set(false);
          this.studioError.set(err.error?.message || 'Failed to upload and parse document.');
        },
      });
  }

  onDeleteSource(sourceId: number): void {
    if (!this.characterId) return;

    this.mindService.deleteSource(this.characterId, sourceId).subscribe({
      next: () => {
        this.sources.update((prev) => prev.filter((s) => s.id !== sourceId));
        this.studioSuccess.set('Source and knowledge chunks removed.');
      },
      error: (err) => {
        this.studioError.set(err.error?.message || 'Failed to delete source.');
      },
    });
  }

  onSubmit(): void {
    if (this.characterForm.invalid) {
      this.characterForm.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.isLoading = true;

    const val = this.characterForm.value;

    const isSports = Boolean(val.is_sports_analyst || val.relationship_type === 'sports');
    const role = val.relationship_type === 'sports' ? 'mentor' : (val.relationship_type || 'friend');
    const finalName = (val.name || 'Companion').trim();
    const finalPersonality = (val.personality || '').trim() ||
      (isSports ? 'Sharp, collaborative football match forecaster and betting options sparring partner. Forecasts how a match will play out in plain English, grills your betting options to expose traps, and helps you lock in the smartest play.' : 'Empathetic, attentive, and authentic companion.');
    const finalGreeting = (val.greeting || '').trim() ||
      (isSports ? `Hey mate! I'm ${finalName}, your Match Forecaster & Options Copilot. Drop any upcoming match or the betting options you're considering and let's grill them together.` : `Hey! I'm ${finalName}. What would you like to explore today?`);
    const finalTone = (val.tone || 'Warm & Thoughtful').trim();
    const finalStyle = (val.style || 'Direct & Conversational').trim();

    const interests = val.interestsString
      ? val.interestsString.split(',').map((s: string) => s.trim()).filter((s: string) => !!s)
      : [];

    const nicknames_for_user = val.nicknames_for_user
      ? val.nicknames_for_user.split(',').map((s: string) => s.trim()).filter((s: string) => !!s)
      : [];

    const catchphrases = val.catchphrases
      ? val.catchphrases.split(',').map((s: string) => s.trim()).filter((s: string) => !!s)
      : [];

    const dto: CreateCharacterDto = {
      name: finalName,
      avatarUrl: val.avatarUrl || null,
      gender: val.gender || 'Non-Binary',
      relationship_type: role,
      nicknames_for_user,
      catchphrases,
      speech_quirks: val.speech_quirks || null,
      shared_memories_seed: val.shared_memories_seed || null,
      personality: finalPersonality,
      tone: finalTone,
      humor: parseInt(val.humor, 10) || 5,
      friendliness: parseInt(val.friendliness, 10) || 5,
      creativity: parseInt(val.creativity, 10) || 5,
      style: finalStyle,
      backstory: val.backstory || null,
      interests,
      greeting: finalGreeting,
      voice_provider: val.voice_provider || 'preset',
      voice_id: val.voice_id || 'alloy',
      voice_sample_url: val.voice_sample_url || null,
      voice_settings: val.voice_settings || null,
      is_public: false,
      handle: null,
      headline: null,
      website_url: null,
      philosophy_statement: null,
      mental_models: [],
      tags: [],
      is_sports_analyst: isSports,
      analysis_style: isSports ? (val.analysis_style || 'quant_expected_value') : 'quant_expected_value',
      primary_leagues: isSports ? (val.primary_leagues?.length ? val.primary_leagues : ['Premier League']) : [],
      risk_tier: isSports ? (val.risk_tier || 'balanced_quarter_kelly') : 'balanced_quarter_kelly',
      allow_proactive_checkins: Boolean(val.allow_proactive_checkins),
      proactive_frequency: val.proactive_frequency || '24h',
      proactive_preferred_time: val.proactive_preferred_time || 'anytime',
      proactive_channels: {
        push: Boolean(val.proactive_notify_push),
        email: Boolean(val.proactive_notify_email),
      },
    };

    if (this.isEditMode && this.characterId) {
      this.characterService.updateCharacter(this.characterId, dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/dashboard/characters']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.error?.message || 'Failed to update character.';
        },
      });
    } else {
      this.characterService.createCharacter(dto).subscribe({
        next: (res) => {
          this.isLoading = false;
          // If public and created, redirect to edit or list
          this.router.navigate(['/dashboard/characters']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.error?.message || 'Failed to create character.';
        },
      });
    }
  }
}
