# GitHub Copilot Instructions for Arcane Kitchen

## Project Overview

Arcane Kitchen is an AI-powered culinary companion that gamifies cooking through RPG-like mechanics. The application helps users explore recipes from around the world, customize them to their preferences, and build their own virtual cookbook. Users can level up their cooking skills, interact socially with other "kitchen witches," and receive AI-powered recipe generation and cooking assistance.

### Key Features

- **Recipe Discovery**: Search and explore recipes by region, ingredient, dietary restrictions, or "magical properties"
- **Mystical Sous Chef AI**: AI-powered cooking assistant for recipe refinement and customization
- **Alchemical Transformations**: Recipe modifications for dietary accommodations
- **Grimoire (Personal Cookbook)**: User's collection of saved and created recipes
- **Coven Community**: Social features for recipe sharing and interaction
- **Herbal Wisdom**: Educational content about ingredient properties

## Technical Architecture

- **Frontend**: React 18 with TypeScript, Vite build system, Tailwind CSS for styling
- **Backend**: AWS Amplify with GraphQL API, DynamoDB for data storage
- **Authentication**: AWS Cognito user pools
- **AI Integration**: Amazon Nova Pro for conversational AI (SousChef assistant)
- **Deployment**: AWS Amplify hosting with CI/CD

## Code Style and Conventions

### TypeScript Guidelines

- Use strict TypeScript with proper type definitions
- Define interfaces for all props and complex data structures
- Use `React.FC<Props>` typing for functional components
- Prefer `const` assertions and literal types where appropriate
- Use proper generic typing for AWS Amplify client operations

### React Patterns

- Use functional components with hooks exclusively
- Implement custom hooks for shared logic (e.g., `useMessages`, `useAuth`)
- Use proper dependency arrays in `useEffect` hooks
- Implement proper cleanup in effects when needed
- Follow React 18 concurrent features best practices

### Styling Conventions

- Use Tailwind CSS utility classes for styling
- Maintain mystical/arcane theme with custom color palette (`cottage-interior`, `arcane-parchment`)
- Use responsive design patterns (`sm:`, `md:`, `lg:` breakpoints)
- Implement hover and transition effects for interactive elements
- Maintain consistent spacing and typography scale

### File Organization

- Components in `/src/components/` with PascalCase naming
- Custom hooks in `/src/hooks/` with `use` prefix
- Utilities in `/src/utils/` with camelCase naming
- Type definitions co-located with components or in dedicated files
- AWS Amplify configuration in `/amplify/` directory

### Naming Conventions

- **Components**: PascalCase (e.g., `ChatInterface`, `SousChef`)
- **Files**: PascalCase for components, camelCase for utilities
- **Variables/Functions**: camelCase with descriptive names
- **Constants**: UPPER_SNAKE_CASE for app-wide constants
- **CSS Classes**: Follow Tailwind conventions, use custom classes sparingly

## AI Integration Guidelines

### Invisible AI Principle

- AI features should enhance user experience without being prominently advertised
- Focus on natural, helpful interactions rather than showcasing AI capabilities
- Frame AI assistance as "mystical" or "magical" guidance within the app's theme
- Avoid technical AI terminology in user-facing content

### SousChef Assistant

- Implement conversational patterns that feel natural and cooking-focused
- Maintain conversation context and history for coherent interactions
- Handle authentication requirements for AI features gracefully
- Provide fallback responses when AI services are unavailable
- Log interactions appropriately for debugging without compromising privacy

## Decision-Making Rules

### Performance

- Prioritize Core Web Vitals optimization
- Implement lazy loading for non-critical components
- Use React.memo() for expensive re-renders
- Optimize AWS Amplify queries with proper caching strategies
- Minimize bundle size through code splitting

### Security

- Never expose AWS credentials or API keys in frontend code
- Use AWS Amplify's built-in authentication patterns
- Validate user inputs before sending to AI services
- Implement proper authorization checks for protected features
- Follow OWASP security guidelines for web applications

### User Experience

- Maintain the mystical/magical theme consistently
- Provide clear loading states for AI interactions
- Implement proper error handling with user-friendly messages
- Ensure accessibility compliance (WCAG 2.1 AA)
- Design for mobile-first responsive experience

### Code Quality

- Follow the existing ESLint and Prettier configurations
- Write self-documenting code with meaningful variable names
- Add comments only when business logic requires explanation
- Prefer composition over inheritance
- Keep functions small and focused on single responsibilities

### Testing Considerations

- Write components to be easily testable
- Mock AWS Amplify services in tests
- Test error scenarios and edge cases
- Ensure AI integration points have proper fallbacks
- Test authentication flows thoroughly

## Integration Points

When working with existing code:

- Respect the established patterns in `useMessages` hook for AI interactions
- Follow the authentication patterns in `useAuth` hook
- Maintain consistency with existing component structure
- Use established utility functions before creating new ones
- Preserve the mystical theming and language throughout

## Error Handling

- Implement graceful degradation for AI service failures
- Provide meaningful error messages that fit the app's theme
- Log errors appropriately for debugging
- Use try-catch blocks around all async operations
- Handle network connectivity issues gracefully

## Accessibility

- Ensure proper ARIA labels for interactive elements
- Maintain keyboard navigation support
- Use semantic HTML elements
- Provide alt text for decorative images
- Test with screen readers
- Maintain sufficient color contrast ratios

Remember: The goal is to create a delightful, magical cooking experience that happens to be powered by AI, not an AI demonstration that happens to involve cooking.
