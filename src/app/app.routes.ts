import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // Direct entry straight into the app (no landing page)
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard/characters',
  },
  {
    path: 'landing',
    loadComponent: () =>
      import('./features/landing/landing-page.component').then((m) => m.LandingPageComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  // Public Thought Commons Routes
  {
    path: 'explore',
    loadComponent: () =>
      import('./features/minds/mind-explore/mind-explore.component').then((m) => m.MindExploreComponent),
  },
  {
    path: 'minds/explore',
    loadComponent: () =>
      import('./features/minds/mind-explore/mind-explore.component').then((m) => m.MindExploreComponent),
  },
  {
    path: 'minds/:handle',
    loadComponent: () =>
      import('./features/minds/mind-profile/mind-profile.component').then((m) => m.MindProfileComponent),
  },
  {
    path: 'm/:handle',
    loadComponent: () =>
      import('./features/minds/mind-profile/mind-profile.component').then((m) => m.MindProfileComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/layout/dashboard-shell/dashboard-shell.component').then(
        (m) => m.DashboardShellComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'characters',
      },
      {
        path: 'characters',
        loadComponent: () =>
          import('./features/characters/character-list/character-list.component').then(
            (m) => m.CharacterListComponent
          ),
      },
      {
        path: 'characters/new',
        loadComponent: () =>
          import('./features/characters/character-form/character-form.component').then(
            (m) => m.CharacterFormComponent
          ),
      },
      {
        path: 'characters/:id/edit',
        loadComponent: () =>
          import('./features/characters/character-form/character-form.component').then(
            (m) => m.CharacterFormComponent
          ),
      },
      {
        path: 'characters/:id/studio',
        loadComponent: () =>
          import('./features/characters/mind-studio/mind-studio.component').then(
            (m) => m.MindStudioComponent
          ),
      },
      {
        path: 'chat/:characterId',
        loadComponent: () =>
          import('./features/chat/chat-view/chat-view.component').then(
            (m) => m.ChatViewComponent
          ),
      },
      {
        path: 'minds',
        loadComponent: () =>
          import('./features/minds/mind-explore/mind-explore.component').then(
            (m) => m.MindExploreComponent
          ),
      },
      {
        path: 'explore',
        loadComponent: () =>
          import('./features/minds/mind-explore/mind-explore.component').then(
            (m) => m.MindExploreComponent
          ),
      },
      {
        path: 'my-mind',
        loadComponent: () =>
          import('./features/my-mind/my-mind-studio/my-mind-studio.component').then(
            (m) => m.MyMindStudioComponent
          ),
      },
      {
        path: 'minds/:handle',
        loadComponent: () =>
          import('./features/minds/mind-profile/mind-profile.component').then(
            (m) => m.MindProfileComponent
          ),
      },
      {
        path: 'consult/:handle',
        loadComponent: () =>
          import('./features/minds/mind-profile/mind-profile.component').then(
            (m) => m.MindProfileComponent
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
