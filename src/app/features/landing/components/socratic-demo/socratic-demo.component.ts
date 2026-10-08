import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface SocraticScenario {
  id: string;
  tabLabel: string;
  userPrompt: string;
  standardBot: {
    wordCount: number;
    bulletCount: number;
    intro: string;
    bullets: string[];
    outro: string;
  };
  socraticEngine: {
    wordCount: number;
    sentenceCount: number;
    response: string;
    diagnosticFocus: string;
    citedModel: string;
  };
}

@Component({
  selector: 'app-socratic-demo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './socratic-demo.component.html',
  styleUrl: './socratic-demo.component.scss',
})
export class SocraticDemoComponent {
  readonly activeScenarioIndex = signal<number>(0);

  readonly scenarios: SocraticScenario[] = [
    {
      id: 'startup',
      tabLabel: 'Career & Startups',
      userPrompt: 'Should I quit my VP role at a tech giant to raise venture capital for an AI productivity tool?',
      standardBot: {
        wordCount: 374,
        bulletCount: 6,
        intro:
          'As an AI language model, leaving an executive role to pursue entrepreneurship is a multifaceted decision that involves weighing numerous professional and financial variables. Here are 6 key considerations to keep in mind:',
        bullets: [
          'Financial Runway: Ensure you have at least 12 to 18 months of personal savings before resigning.',
          'Market Validation: Conduct customer discovery calls to ensure there is tangible demand for your tool.',
          'Competitive Landscape: AI is currently a very crowded sector with rapid incumbents.',
          'Risk Tolerance: Prepare yourself mentally for fluctuating income and founder stress.',
          'Network & Hiring: Evaluate whether you can recruit top-tier engineers to join you.',
          'Timing & Family: Discuss the transition with your dependents and mentors.',
        ],
        outro:
          'In conclusion, both paths have valid advantages. Make sure to consult with a career coach or financial planner before making your final leap!',
      },
      socraticEngine: {
        wordCount: 34,
        sentenceCount: 2,
        response:
          'Do you crave the status of being a venture-backed founder, or are you genuinely obsessed with solving this exact user bottleneck for the next decade? If the money and title disappeared tomorrow, would you still build it?',
        diagnosticFocus: 'Identifies vanity-driven escapism vs authentic problem obsession',
        citedModel: 'First-Principles Intrinsic Motivation (Paul Graham & Naval Ravikant)',
      },
    },
    {
      id: 'engineering',
      tabLabel: 'System Architecture',
      userPrompt: 'Our distributed cache is experiencing 450ms tail latency spikes during morning flash sales. Should we add a Redis cluster tier?',
      standardBot: {
        wordCount: 345,
        bulletCount: 6,
        intro:
          'Caching latency spikes can be caused by various bottlenecks in modern distributed systems. Here are 6 comprehensive strategies you should investigate before making hardware decisions:',
        bullets: [
          'Examine cache key eviction policies (LRU vs LFU) to identify thrashing.',
          'Scale up Redis cluster shards and configure read-replicas across availability zones.',
          'Check network bandwidth saturation on VPC peering links.',
          'Implement client-side caching (stale-while-revalidate pattern) in application pods.',
          'Profile serialization overhead (JSON vs Protobuf or MessagePack).',
          'Audit hot-key contention using Redis telemetry and Prometheus alerts.',
        ],
        outro:
          'By methodically profiling each tier from client to database, you will be able to pinpoint the root cause of your tail latency degradation.',
      },
      socraticEngine: {
        wordCount: 32,
        sentenceCount: 2,
        response:
          'Why are you attempting to cache queries that should not be queried at all? Have you profiled your single biggest hot key to see if client-side deduplication eliminates the burst entirely?',
        diagnosticFocus: 'Deletes unnecessary architectural complexity before throwing cluster mass at it',
        citedModel: 'SpaceX 5-Step Engineering Algorithm §2 (Delete the requirement)',
      },
    },
    {
      id: 'grief',
      tabLabel: 'Regret & Relationships',
      userPrompt: 'My father passed away last winter before we could resolve our long estrangement. How do I live with this unresolved regret?',
      standardBot: {
        wordCount: 360,
        bulletCount: 5,
        intro:
          'Grief complicated by unresolved relationships can be exceptionally painful to navigate. Here are several general therapeutic coping strategies often recommended by mental health resources:',
        bullets: [
          'Acknowledge your emotions: Allow yourself to feel anger, sorrow, and guilt without self-judgment.',
          'Write an unsent letter: Express everything you wished you had spoken aloud to him.',
          'Focus on forgiveness: Recognize that both of you were imperfect humans with unique limitations.',
          'Seek professional therapy: Working with a licensed counselor can facilitate healthy closure.',
          'Honor positive memories: Channel lessons learned into your present relationships.',
        ],
        outro:
          'Healing is not linear, so take things one day at a time. Please remember that support groups are available if feelings become overwhelming.',
      },
      socraticEngine: {
        wordCount: 29,
        sentenceCount: 2,
        response:
          'You are judging the past with wisdom you only gained from losing him. If love is what creates this ache, why treat the ache as a crime instead of his final gift to your growth?',
        diagnosticFocus: 'Transmutes corrosive retrospective guilt into tender human reverence',
        citedModel: 'Stoic Amor Fati & Relational Compassion Vault',
      },
    },
  ];

  selectScenario(index: number): void {
    this.activeScenarioIndex.set(index);
  }
}
