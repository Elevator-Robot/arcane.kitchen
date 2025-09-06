#!/usr/bin/env python3
"""
Create test recipes for Arcane Kitchen
"""

import requests
import json
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# Configuration
GRAPHQL_ENDPOINT = "https://bzg3wm3cvrcnxnjdswzjxjju7y.appsync-api.us-east-1.amazonaws.com/graphql"
AWS_REGION = "us-east-1"

def get_aws_credentials():
    """Get AWS credentials using boto3"""
    session = boto3.Session(profile_name='brain')
    credentials = session.get_credentials()
    return credentials

def create_recipe(recipe_data):
    """Create a recipe in the database"""
    mutation = """
    mutation CreateRecipe($input: CreateRecipeInput!) {
        createRecipe(input: $input) {
            id
            title
            description
            ingredients
            instructions
            prepTime
            cookTime
            servings
            isPublic
        }
    }
    """
    
    variables = {"input": recipe_data}
    
    credentials = get_aws_credentials()
    
    request = AWSRequest(
        method='POST',
        url=GRAPHQL_ENDPOINT,
        data=json.dumps({"query": mutation, "variables": variables}),
        headers={'Content-Type': 'application/x-amz-json-1.1'}
    )
    
    SigV4Auth(credentials, 'appsync', AWS_REGION).add_auth(request)
    
    try:
        response = requests.post(
            GRAPHQL_ENDPOINT,
            data=request.body,
            headers=dict(request.headers),
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.text:
            result = response.json()
            if "errors" in result:
                print(f"Errors: {json.dumps(result['errors'], indent=2)}")
            else:
                print(f"Created: {result['data']['createRecipe']['title']}")
                return result['data']['createRecipe']['id']
        
    except Exception as e:
        print(f"Failed to create recipe: {e}")
    
    return None

# Test recipes
recipes = [
    {
        "title": "Mystical Mushroom Risotto",
        "description": "A creamy risotto infused with magical forest mushrooms",
        "ingredients": [
            "1 cup Arborio rice",
            "4 cups warm vegetable broth",
            "1 cup mixed wild mushrooms",
            "1/2 cup white wine",
            "1 onion, diced",
            "2 cloves garlic, minced",
            "1/4 cup parmesan cheese",
            "2 tbsp butter",
            "Fresh thyme"
        ],
        "instructions": [
            "Sauté onion and garlic in butter",
            "Add rice and toast for 2 minutes",
            "Add wine and stir until absorbed",
            "Gradually add warm broth, stirring constantly",
            "Sauté mushrooms separately and fold in",
            "Finish with parmesan and thyme"
        ],
        "prepTime": "15 minutes",
        "cookTime": "25 minutes",
        "servings": 4,
        "isPublic": True
    },
    {
        "title": "Enchanted Herb Bread",
        "description": "Ancient grain bread blessed with protective herbs",
        "ingredients": [
            "3 cups bread flour",
            "1 cup whole wheat flour",
            "2 tsp active dry yeast",
            "1 tsp salt",
            "2 tbsp honey",
            "1 cup warm water",
            "2 tbsp olive oil",
            "1 tbsp rosemary",
            "1 tbsp sage",
            "1 tsp thyme"
        ],
        "instructions": [
            "Dissolve yeast in warm water with honey",
            "Mix flours, salt, and herbs in large bowl",
            "Add yeast mixture and olive oil",
            "Knead for 10 minutes until smooth",
            "Rise for 1 hour until doubled",
            "Shape and rise again for 45 minutes",
            "Bake at 375°F for 35-40 minutes"
        ],
        "prepTime": "20 minutes",
        "cookTime": "40 minutes",
        "servings": 8,
        "isPublic": True
    },
    {
        "title": "Potion of Healing Soup",
        "description": "A nourishing elixir to restore vitality and warmth",
        "ingredients": [
            "1 whole chicken",
            "2 carrots, sliced",
            "2 celery stalks, chopped",
            "1 onion, diced",
            "3 cloves garlic",
            "1 bay leaf",
            "Fresh ginger root",
            "Turmeric powder",
            "Sea salt",
            "Black pepper",
            "Fresh parsley"
        ],
        "instructions": [
            "Simmer chicken in water for 1 hour",
            "Remove chicken and shred meat",
            "Strain broth and return to pot",
            "Add vegetables and simmer 20 minutes",
            "Add shredded chicken back to pot",
            "Season with herbs and spices",
            "Garnish with fresh parsley"
        ],
        "prepTime": "15 minutes",
        "cookTime": "90 minutes",
        "servings": 6,
        "isPublic": True
    }
]

if __name__ == "__main__":
    print("🔮 Creating Mystical Test Recipes")
    print("=" * 40)
    
    created_ids = []
    
    for recipe in recipes:
        print(f"\n✨ Creating: {recipe['title']}")
        recipe_id = create_recipe(recipe)
        if recipe_id:
            created_ids.append(recipe_id)
    
    print(f"\n🎉 Created {len(created_ids)} recipes!")
    if created_ids:
        print("Recipe IDs:", created_ids)
