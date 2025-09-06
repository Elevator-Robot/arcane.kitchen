#!/usr/bin/env python3
"""
Test script for Arcane Kitchen GraphQL recipe responses
"""

import requests
import json
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# Configuration from amplify_outputs.json
GRAPHQL_ENDPOINT = "https://bzg3wm3cvrcnxnjdswzjxjju7y.appsync-api.us-east-1.amazonaws.com/graphql"
AWS_REGION = "us-east-1"

def get_aws_credentials():
    """Get AWS credentials using boto3"""
    session = boto3.Session(profile_name='brain')
    credentials = session.get_credentials()
    return credentials

def test_list_recipes():
    """Test listing recipes"""
    query = """
    query ListRecipes {
        listRecipes {
            items {
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
    }
    """
    
    credentials = get_aws_credentials()
    
    request = AWSRequest(
        method='POST',
        url=GRAPHQL_ENDPOINT,
        data=json.dumps({"query": query}),
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
            try:
                print(f"Response: {json.dumps(response.json(), indent=2)}")
            except json.JSONDecodeError:
                print(f"Raw Response: {response.text}")
        else:
            print("Empty response")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

def test_get_recipe(recipe_id):
    """Test getting a specific recipe"""
    query = """
    query GetRecipe($id: ID!) {
        getRecipe(id: $id) {
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
    
    variables = {"id": recipe_id}
    
    credentials = get_aws_credentials()
    
    request = AWSRequest(
        method='POST',
        url=GRAPHQL_ENDPOINT,
        data=json.dumps({"query": query, "variables": variables}),
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
            try:
                print(f"Response: {json.dumps(response.json(), indent=2)}")
            except json.JSONDecodeError:
                print(f"Raw Response: {response.text}")
        else:
            print("Empty response")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    print("🔮 Testing Arcane Kitchen GraphQL Recipe API")
    print("=" * 50)
    
    # Test recipe list query
    print("\n📜 Testing recipe list query...")
    test_list_recipes()
    
    # Test specific recipe (use actual ID if you have one)
    print("\n🍲 Testing specific recipe query...")
    test_get_recipe("test-recipe-id")
