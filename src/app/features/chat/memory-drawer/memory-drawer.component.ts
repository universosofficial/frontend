import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoryService } from '../../../core/services/memory.service';
import { ChatService } from '../../../core/services/chat.service';
import { Memory } from '../../../core/models/memory.model';

@Component({
  selector: 'app-memory-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memory-drawer.component.html',
  styleUrl: './memory-drawer.component.scss',
})
export class MemoryDrawerComponent implements OnChanges {
  memoryService = inject(MemoryService);
  chatService = inject(ChatService);

  @Input() isOpen = false;
  @Input() characterId!: number;
  @Output() close = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue && this.characterId) {
      this.loadMemories();
    }
  }

  loadMemories(): void {
    if (this.characterId) {
      this.memoryService.getMemories(this.characterId).subscribe();
    }
  }

  onDelete(memory: Memory, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm(`Forget this memory: "${memory.content}"?`)) {
      this.memoryService.deleteMemory(memory.id).subscribe();
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
