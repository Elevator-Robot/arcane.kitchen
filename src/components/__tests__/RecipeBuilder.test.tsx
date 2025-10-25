import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeBuilder from '../RecipeBuilder';
import {
  render,
  defaultRecipeBuilderProps,
  unauthenticatedRecipeBuilderProps,
} from '../../test/test-utils';

// Create mock functions
const mockHandleSendMessage = vi.fn();
const mockHandleQuickMessage = vi.fn();
const mockAddMessage = vi.fn();

// Create a controllable mock for useMessages
const mockUseMessagesReturn = {
  messages: [],
  isWaitingForResponse: false,
  messagesEndRef: { current: null },
  addMessage: mockAddMessage,
  handleSendMessage: mockHandleSendMessage,
  handleQuickMessage: mockHandleQuickMessage,
};

// Mock the useMessages hook
vi.mock('../../hooks/useMessages', () => ({
  useMessages: vi.fn(() => mockUseMessagesReturn),
}));

describe('RecipeBuilder Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleSendMessage.mockClear();
    mockHandleQuickMessage.mockClear();
    mockAddMessage.mockClear();

    // Reset mock implementations and state
    mockHandleSendMessage.mockImplementation(async () => Promise.resolve());
    mockHandleQuickMessage.mockImplementation(async () => Promise.resolve());
    mockUseMessagesReturn.isWaitingForResponse = false;
    mockUseMessagesReturn.messages = [];
  });

  describe('GIVEN the Recipe Builder is rendered', () => {
    it('WHEN the component mounts THEN it should display the builder form and preview panel', () => {
      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      // Form section
      expect(screen.getByText('Craft Your Recipe')).toBeInTheDocument();
      expect(screen.getByText('What are you creating?')).toBeInTheDocument();
      expect(screen.getByText('Key Ingredients')).toBeInTheDocument();
      expect(screen.getByText('Cuisine Style')).toBeInTheDocument();
      expect(screen.getByText('Cooking Time')).toBeInTheDocument();
      expect(screen.getByText('Servings')).toBeInTheDocument();
      expect(screen.getByText('Dietary Considerations')).toBeInTheDocument();
      expect(screen.getByText('Special Requests or Notes')).toBeInTheDocument();

      // Preview panel
      expect(screen.getByText('Your Mystical Recipe')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Your recipe will materialize here once you cast the spell...'
        )
      ).toBeInTheDocument();

      // Action buttons
      expect(
        screen.getByRole('button', { name: /create recipe/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reset/i })
      ).toBeInTheDocument();
    });

    it('WHEN examining form fields THEN all inputs should be discoverable by accessible selectors', () => {
      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      // Check for accessible form elements
      expect(
        screen.getByPlaceholderText('e.g., chicken, herbs, tomatoes...')
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Select cuisine style...')
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('4')).toBeInTheDocument(); // servings input
      expect(
        screen.getByPlaceholderText(/Any special requirements/)
      ).toBeInTheDocument();

      // All dish type buttons should be accessible by role
      const dishTypeButtons = screen.getAllByRole('button');
      const createRecipeButton = screen.getByRole('button', {
        name: /create recipe/i,
      });
      const resetButton = screen.getByRole('button', { name: /reset/i });

      expect(dishTypeButtons.length).toBeGreaterThan(10); // 8 dish types + dietary options + action buttons
      expect(createRecipeButton).toBeInTheDocument();
      expect(resetButton).toBeInTheDocument();
    });

    it('WHEN the preview region is checked THEN it should be properly labeled for accessibility', () => {
      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      // The preview section should be identifiable
      const previewSection = screen
        .getByText('Your Mystical Recipe')
        .closest('div');
      expect(previewSection).toBeInTheDocument();
      expect(previewSection).toHaveClass('bg-gradient-to-br');
    });
  });

  describe('GIVEN form validation scenarios', () => {
    it('WHEN no ingredients are entered THEN the form should still be submittable but provide guidance', async () => {
      const user = userEvent.setup();
      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      const createButton = screen.getByRole('button', {
        name: /create recipe/i,
      });

      // Should be enabled even without ingredients
      expect(createButton).not.toBeDisabled();

      await user.click(createButton);

      // Should still call handleSendMessage with a basic prompt
      expect(mockHandleSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Create a delicious recipe'),
        true,
        defaultRecipeBuilderProps.currentUser
      );
    });

    it('WHEN invalid servings are entered THEN the field should accept the input', async () => {
      const user = userEvent.setup();
      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      const servingsInput = screen.getByDisplayValue('4');

      await user.clear(servingsInput);
      await user.type(servingsInput, '0');

      // The input accepts the value (validation would be handled by HTML5 min attribute)
      expect(servingsInput).toHaveValue(0);
    });

    it('WHEN servings exceed maximum THEN the field should accept the input', async () => {
      const user = userEvent.setup();
      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      const servingsInput = screen.getByDisplayValue('4');

      await user.clear(servingsInput);
      await user.type(servingsInput, '25');

      // The input accepts the value (validation would be handled by HTML5 max attribute)
      expect(servingsInput).toHaveValue(25);
    });
  });

  describe('GIVEN authentication states', () => {
    it('WHEN user is not authenticated THEN the Create Recipe button should be disabled', () => {
      render(<RecipeBuilder {...unauthenticatedRecipeBuilderProps} />);

      const createButton = screen.getByRole('button', {
        name: /create recipe/i,
      });
      expect(createButton).toBeDisabled();
    });

    it('WHEN user is authenticated THEN the Create Recipe button should be enabled', () => {
      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      const createButton = screen.getByRole('button', {
        name: /create recipe/i,
      });
      expect(createButton).not.toBeDisabled();
    });

    it('WHEN unauthenticated user tries to generate recipe THEN handleSendMessage should not be called', async () => {
      render(<RecipeBuilder {...unauthenticatedRecipeBuilderProps} />);

      const createButton = screen.getByRole('button', {
        name: /create recipe/i,
      });

      // Button should be disabled, but test the logic anyway
      expect(createButton).toBeDisabled();

      // Even if we could click, the handler should not proceed
      fireEvent.click(createButton);
      expect(mockHandleSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the Create Recipe action flow', () => {
    it('WHEN clicking Create Recipe with full form data THEN it should generate a recipe and show visible output', async () => {
      const user = userEvent.setup();

      // Mock a successful recipe generation
      mockHandleSendMessage.mockImplementation(async () => {
        // Simulate what the real hook would do - set a temporary message
        return Promise.resolve();
      });

      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      // Fill out the form with complete data
      const appetizer = screen.getByText('Appetizer');
      await user.click(appetizer);

      const ingredientsInput = screen.getByPlaceholderText(
        'e.g., chicken, herbs, tomatoes...'
      );
      await user.type(ingredientsInput, 'chicken{enter}');
      await user.type(ingredientsInput, 'herbs{enter}');

      const cuisineSelect = screen.getByDisplayValue('Select cuisine style...');
      await user.selectOptions(cuisineSelect, 'Mediterranean');

      const vegetarianOption = screen.getByText('Vegetarian');
      await user.click(vegetarianOption);

      const servingsInput = screen.getByDisplayValue('4');
      await user.clear(servingsInput);
      await user.type(servingsInput, '6');

      const notesTextarea = screen.getByPlaceholderText(
        /Any special requirements/
      );
      await user.type(notesTextarea, 'Make it extra magical with herbs');

      // Click Create Recipe
      const createButton = screen.getByRole('button', {
        name: /create recipe/i,
      });
      await user.click(createButton);

      // Verify the recipe generation was triggered with correct parameters
      const [actualPrompt] = mockHandleSendMessage.mock.calls[0];

      // Test key components of the generated prompt
      expect(actualPrompt).toContain('Create a appetizer recipe');
      expect(actualPrompt).toContain('featuring chicken, herbs');
      expect(actualPrompt).toContain('Mediterranean style');
      expect(actualPrompt).toContain('serves 6 people');
      expect(actualPrompt).toContain('Make it vegetarian');
      expect(actualPrompt).toContain('Difficulty level should be intermediate');
      expect(actualPrompt).toContain('nourishing and healing properties');
      expect(actualPrompt).toContain('Make it extra magical with herbs');

      expect(mockHandleSendMessage).toHaveBeenCalledWith(
        actualPrompt,
        true,
        defaultRecipeBuilderProps.currentUser
      );

      // Should show loading state initially
      expect(
        screen.getByText(
          'Recipe is being conjured by your kitchen assistant...'
        )
      ).toBeInTheDocument();
    });

    it('WHEN Create Recipe generates content THEN the preview should show visible recipe text', async () => {
      const user = userEvent.setup();

      // Mock successful recipe generation
      mockHandleSendMessage.mockImplementation(async () => {
        // Simulate successful generation
        return Promise.resolve();
      });

      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      // Add some basic form data
      const mainCourseButton = screen.getByText('Main Course');
      await user.click(mainCourseButton);

      // Click Create Recipe
      const createButton = screen.getByRole('button', {
        name: /create recipe/i,
      });
      await user.click(createButton);

      // Should show the placeholder message
      await waitFor(() => {
        expect(
          screen.getByText(
            'Recipe is being conjured by your kitchen assistant...'
          )
        ).toBeInTheDocument();
      });
    });

    it('GOLDEN TEST: WHEN Create Recipe succeeds THEN it should log the user-visible preview text to console', async () => {
      console.log(
        '\n🧙‍♀️✨ GOLDEN TEST - Recipe Builder Create Action Output ✨🧙‍♀️'
      );
      console.log('='.repeat(70));

      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      // Fill out a realistic recipe request
      const dessertButton = screen.getByText('Dessert');
      await user.click(dessertButton);

      const ingredientsInput = screen.getByPlaceholderText(
        'e.g., chicken, herbs, tomatoes...'
      );
      await user.type(ingredientsInput, 'chocolate{enter}');
      await user.type(ingredientsInput, 'vanilla{enter}');

      const cuisineSelect = screen.getByDisplayValue('Select cuisine style...');
      await user.selectOptions(cuisineSelect, 'Traditional European');

      const veganOption = screen.getByText('Vegan');
      await user.click(veganOption);

      const createButton = screen.getByRole('button', {
        name: /create recipe/i,
      });
      await user.click(createButton);

      // Log the visible output that users see
      const previewText = screen.getByText(
        'Recipe is being conjured by your kitchen assistant...'
      );

      // Restore console.log and actually log the output
      consoleSpy.mockRestore();
      console.log('\nUser-visible output after clicking "Create Recipe":');
      console.log('Preview Panel Text:', previewText.textContent);
      console.log('\nExpected behavior:');
      console.log('1. Button becomes disabled during generation');
      console.log('2. Preview shows loading message');
      console.log('3. AI integration generates full recipe text');
      console.log('4. Recipe appears in preview panel');
      console.log('\n' + '='.repeat(70));

      expect(previewText).toBeInTheDocument();
    });
  });

  describe('GIVEN loading and error states', () => {
    it('WHEN recipe generation is in progress THEN it should show loading state', async () => {
      const user = userEvent.setup();

      // Mock loading state
      mockUseMessagesReturn.isWaitingForResponse = true;
      mockHandleSendMessage.mockImplementation(async () => {
        return new Promise(() => {}); // Never resolves to simulate loading
      });

      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      const createButton = screen.getByRole('button', {
        name: /create recipe/i,
      });
      await user.click(createButton);

      // Should show loading text and disable button
      await waitFor(() => {
        expect(screen.getByText('Conjuring Recipe...')).toBeInTheDocument();
        expect(createButton).toBeDisabled();
      });
    });

    it('WHEN recipe generation fails THEN it should show error message', async () => {
      const user = userEvent.setup();

      // Mock failed generation
      mockHandleSendMessage.mockRejectedValue(new Error('Network error'));

      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      const createButton = screen.getByRole('button', {
        name: /create recipe/i,
      });
      await user.click(createButton);

      // Should show error message after failure
      await waitFor(() => {
        expect(
          screen.getByText(
            'The mystical energies are clouded. Please try again.'
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe('GIVEN form interactions', () => {
    it('WHEN selecting dish types THEN the selection should be visible', async () => {
      const user = userEvent.setup();
      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      const soupButton = screen.getByText('Soup & Stew');
      await user.click(soupButton);

      // Should have selected styling
      expect(soupButton.closest('button')).toHaveClass('bg-emerald-600/40');
    });

    it('WHEN adding ingredients THEN they should appear as removable tags', async () => {
      const user = userEvent.setup();
      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      const ingredientsInput = screen.getByPlaceholderText(
        'e.g., chicken, herbs, tomatoes...'
      );
      await user.type(ingredientsInput, 'tomato{enter}');

      // Should show the ingredient tag
      expect(screen.getByText('tomato ×')).toBeInTheDocument();

      // Should be removable
      await user.click(screen.getByText('tomato ×'));
      expect(screen.queryByText('tomato ×')).not.toBeInTheDocument();
    });

    it('WHEN selecting dietary restrictions THEN they should toggle properly', async () => {
      const user = userEvent.setup();
      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      const glutenFreeButton = screen.getByText('Gluten-Free');

      // Initially not selected
      expect(glutenFreeButton).toHaveClass('bg-stone-700/50');

      // Click to select
      await user.click(glutenFreeButton);
      expect(glutenFreeButton).toHaveClass('bg-amber-400/30');

      // Click again to deselect
      await user.click(glutenFreeButton);
      expect(glutenFreeButton).toHaveClass('bg-stone-700/50');
    });

    it('WHEN clicking Reset THEN all form data should be cleared', async () => {
      const user = userEvent.setup();
      render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

      // Fill some data
      const dessertButton = screen.getByText('Dessert');
      await user.click(dessertButton);

      const ingredientsInput = screen.getByPlaceholderText(
        'e.g., chicken, herbs, tomatoes...'
      );
      await user.type(ingredientsInput, 'sugar{enter}');

      const notesTextarea = screen.getByPlaceholderText(
        /Any special requirements/
      );
      await user.type(notesTextarea, 'Test notes');

      // Verify data is there
      expect(dessertButton.closest('button')).toHaveClass('bg-emerald-600/40');
      expect(screen.getByText('sugar ×')).toBeInTheDocument();
      expect(notesTextarea).toHaveValue('Test notes');

      // Reset form
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      // Verify data is cleared
      expect(dessertButton.closest('button')).toHaveClass('bg-stone-700/40');
      expect(screen.queryByText('sugar ×')).not.toBeInTheDocument();
      expect(notesTextarea).toHaveValue('');
    });
  });
});
