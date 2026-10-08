import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface VerifiedSource {
  title: string;
  type: 'pdf' | 'url' | 'document';
  chunks: number;
  snippet: string;
}

export interface PreviewMind {
  id: string;
  name: string;
  handle: string;
  category: string;
  headline: string;
  philosophyStatement: string;
  tags: string[];
  subscribers: number;
  consultations: number;
  mentalModels: string[];
  sources: VerifiedSource[];
  sampleQuestion: string;
  sampleAnswer: string;
}

@Component({
  selector: 'app-mind-directory-preview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mind-directory-preview.component.html',
  styleUrl: './mind-directory-preview.component.scss',
})
export class MindDirectoryPreviewComponent {
  readonly searchQuery = signal<string>('');
  readonly selectedTag = signal<string>('All');
  readonly activeModalMind = signal<PreviewMind | null>(null);

  readonly availableTags = ['All', 'Engineering', 'Philosophy', 'Founders', 'Writing', 'Science'];

  readonly mindsList: PreviewMind[] = [
    {
      id: 'marcus',
      name: 'Marcus Aurelius Twin',
      handle: 'marcus',
      category: 'Philosophy',
      headline: 'Stoic Philosophy & Emperor\'s Private Journal',
      philosophyStatement:
        'You have power over your mind, not outside events. Realize this, and you will find unwavering strength.',
      tags: ['Philosophy', 'Stoicism', 'Leadership'],
      subscribers: 2840,
      consultations: 14210,
      mentalModels: ['Dichotomy of Control', 'Amor Fati', 'Memento Mori', 'View from Above'],
      sampleQuestion: 'How do I stop feeling resentful toward people who betray my trust?',
      sampleAnswer:
        'When you wake up in the morning, tell yourself: the people I deal with today will be meddling, ungrateful, arrogant, and dishonest. Why expect a fig tree to bear grapes? If they act out of ignorance, why forfeit your own peace?',
      sources: [
        {
          title: 'Meditations (Hays Translation & Private Notes)',
          type: 'pdf',
          chunks: 142,
          snippet: 'Book IV §3: People look for retreats for themselves, in the country, by the coast, or in the hills. There is nowhere that a person can find a more peaceful and trouble-free retreat than in his own mind.',
        },
        {
          title: 'Military Campaign Journal at Carnuntum',
          type: 'document',
          chunks: 68,
          snippet: 'Notes on bearing hardship during the Marcomannic Wars without self-pity or moral compromise.',
        },
        {
          title: 'Epictetus Discourses Marginalia',
          type: 'pdf',
          chunks: 85,
          snippet: 'Reflections on distinguishing internal character from external fortune.',
        },
      ],
    },
    {
      id: 'elontwin',
      name: 'Elon Musk Twin',
      handle: 'elontwin',
      category: 'Engineering',
      headline: 'First-Principles Physics & Extreme Manufacturing',
      philosophyStatement:
        'Boil things down to the most fundamental truths and reason up from there, rather than reasoning by analogy.',
      tags: ['Engineering', 'Founders', 'Physics'],
      subscribers: 5920,
      consultations: 29480,
      mentalModels: ['First-Principles Physics', '5-Step Algorithm', 'Idiot Index', 'Delete the Part'],
      sampleQuestion: 'Should we add a secondary sensor check to prevent valve jitter?',
      sampleAnswer:
        'No. Did you question the requirement that demands the valve in the first place? If you don’t find yourself adding parts back at least 10% of the time, you’re not deleting enough.',
      sources: [
        {
          title: 'SpaceX Starship Hot Gas Manifold Technical Memos',
          type: 'pdf',
          chunks: 210,
          snippet: 'Memo 2023-A: Minimizing structural mass fraction by eliminating dual-wall cooling jackets in favor of sub-cooled methane film boundary layers.',
        },
        {
          title: 'Tesla Master Plan Parts 1, 2, and 3',
          type: 'url',
          chunks: 94,
          snippet: 'Scaling terawatt-hour manufacturing through vertical integration and unboxed vehicle architecture.',
        },
        {
          title: 'Internal Engineering Algorithm Guidelines',
          type: 'document',
          chunks: 42,
          snippet: 'Step 1: Make requirements less dumb. Everyone is wrong at least some of the time, regardless of title.',
        },
      ],
    },
    {
      id: 'founder_dan',
      name: 'Dan Martell Twin',
      handle: 'founder_dan',
      category: 'Founders',
      headline: 'SaaS Bootstrapping & Buy Back Your Time',
      philosophyStatement:
        'You do not build a business to create a job for yourself. You build systems that run without you.',
      tags: ['Founders', 'SaaS', 'Leadership'],
      subscribers: 3150,
      consultations: 11980,
      mentalModels: ['Buy Back Principle', 'Replacement Ladder', 'Camino Metric', '10-80-10 Rule'],
      sampleQuestion: 'I am working 70 hours a week and drowning in customer support tickets.',
      sampleAnswer:
        'What is your Buyback Rate? If you are answering tickets worth $15/hr while leaving $1,000/hr product architecture untouched, you are actively bankrupting your future company.',
      sources: [
        {
          title: 'Buy Back Your Time: Core Frameworks',
          type: 'pdf',
          chunks: 178,
          snippet: 'Calculate your Buyback Rate: Take your annual net income, divide by 2000 hours, and multiply by 0.25. Never do tasks below that rate again.',
        },
        {
          title: 'SaaS Unit Economics & Churn Audits (2012-2024)',
          type: 'document',
          chunks: 115,
          snippet: 'Net Revenue Retention benchmarking across 40+ portfolio software companies.',
        },
      ],
    },
    {
      id: 'dr_elena',
      name: 'Dr. Elena Rostova',
      handle: 'dr_elena',
      category: 'Science',
      headline: 'Cognitive Neuroscience & Circadian Architecture',
      philosophyStatement:
        'Your subjective consciousness is a continuous biological prediction loop shaped by light, sleep, and metabolic rhythm.',
      tags: ['Science', 'Neuroscience', 'Psychology'],
      subscribers: 2410,
      consultations: 8760,
      mentalModels: ['Synaptic Homeostasis', 'Circadian Entrainment', 'Dopaminergic Baseline', 'Neuroplasticity Windows'],
      sampleQuestion: 'Why do I experience extreme brain fog and lethargy around 2 PM every day?',
      sampleAnswer:
        'When did you consume caffeine upon waking? If you blunted your morning adenosine clearance before 90 minutes of sunlight, you guaranteed an afternoon adenosine crash regardless of food.',
      sources: [
        {
          title: 'Circadian Phase Response Curves to Lux Exposure',
          type: 'pdf',
          chunks: 130,
          snippet: 'Melanopsin-expressing retinal ganglion cells calibrate the suprachiasmatic nucleus within the first 60 minutes of dawn photon exposure.',
        },
        {
          title: 'Synaptic Pruning During Slow-Wave Sleep',
          type: 'url',
          chunks: 92,
          snippet: 'Glymphatic influx increases 60% during non-REM delta wave oscillations, clearing beta-amyloid metabolites.',
        },
      ],
    },
    {
      id: 'sara_poet',
      name: 'Sara Teasdale Persona',
      handle: 'sara_poet',
      category: 'Writing',
      headline: 'Poetic Reflection & Narrative Grief Counsel',
      philosophyStatement:
        'Life has loveliness to sell, all beautiful and splendid things — even in sorrow, words hold the fragile light.',
      tags: ['Writing', 'Poetry', 'Grief'],
      subscribers: 1890,
      consultations: 7420,
      mentalModels: ['Vulnerability Anchoring', 'Catharsis in Form', 'Epistolary Mirroring'],
      sampleQuestion: 'I feel like nobody understands the silence left behind after my loss.',
      sampleAnswer:
        'Silence is not empty; it is simply full of what cannot be spoken aloud in crowded rooms. Let the words rest here with me until you are ready to breathe them.',
      sources: [
        {
          title: 'Flame and Shadow: Complete Anthology',
          type: 'pdf',
          chunks: 88,
          snippet: 'Let it be forgotten, as a flower is forgotten, forgotten as a fire that once was singing gold.',
        },
        {
          title: 'Letters from the Coast (1918-1926)',
          type: 'document',
          chunks: 64,
          snippet: 'Collected correspondences on loss, solitude, and the quiet dignity of memory.',
        },
      ],
    },
    {
      id: 'seneca_mind',
      name: 'Lucius Annaeus Seneca',
      handle: 'seneca_mind',
      category: 'Philosophy',
      headline: 'Ancient Wealth, Time & Moral Agency',
      philosophyStatement:
        'It is not that we have a short time to live, but that we waste a lot of it.',
      tags: ['Philosophy', 'Stoicism', 'Writing'],
      subscribers: 3670,
      consultations: 16890,
      mentalModels: ['Premeditatio Malorum', 'On the Shortness of Life', 'Voluntary Poverty', 'Moral Accounting'],
      sampleQuestion: 'How can I stop procrastinating on my most important creative work?',
      sampleAnswer:
        'You act like mortals in all that you fear, and like immortals in all that you desire. What makes you think you will be granted tomorrow when you squander today?',
      sources: [
        {
          title: 'Epistulae Morales ad Lucilium (Moral Letters)',
          type: 'pdf',
          chunks: 240,
          snippet: 'Letter I: Gather and save your time, which till lately has been forced from you, or stolen, or has merely slipped away.',
        },
        {
          title: 'De Brevitate Vitae (On the Shortness of Life)',
          type: 'document',
          chunks: 75,
          snippet: 'No person hands out their money to passers-by, but to how many each of us divides out our life!',
        },
      ],
    },
  ];

  readonly filteredMinds = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const tag = this.selectedTag();

    return this.mindsList.filter((m) => {
      const matchesTag = tag === 'All' || m.category === tag || m.tags.includes(tag);
      if (!matchesTag) return false;

      if (!query) return true;

      return (
        m.name.toLowerCase().includes(query) ||
        m.handle.toLowerCase().includes(query) ||
        m.headline.toLowerCase().includes(query) ||
        m.philosophyStatement.toLowerCase().includes(query) ||
        m.tags.some((t) => t.toLowerCase().includes(query))
      );
    });
  });

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  selectTag(tag: string): void {
    this.selectedTag.set(tag);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  openModal(mind: PreviewMind): void {
    this.activeModalMind.set(mind);
  }

  closeModal(): void {
    this.activeModalMind.set(null);
  }
}
