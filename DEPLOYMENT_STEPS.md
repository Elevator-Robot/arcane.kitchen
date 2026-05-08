# 🚀 Deployment Steps for Option A Implementation

## ⚠️ IMPORTANT: Backend Changes Required

The new custom Cognito attributes (`custom:cookingStyle`, `custom:magicalSpecialty`, `custom:favoriteIngredients`) need to be deployed to your AWS backend before the frontend changes will work properly.

---

## Step 1: Deploy Backend Changes

### Run Amplify Sandbox
```bash
npx ampx sandbox --once
```

or for continuous deployment during development:
```bash
npx ampx sandbox
```

### What This Does
- Updates your Cognito User Pool to include the new custom attributes
- Redeploys your authentication configuration
- Generates updated `amplify_outputs.json` file

### Expected Output
You should see:
```
✔ Backend synthesized
✔ Type checks completed
✔ Deployment completed
AppSync API endpoint = https://...
File written: amplify_outputs.json
```

---

## Step 2: Test Frontend

### Start Development Server
```bash
npm run dev
```

### Test Flow
1. **Sign Up New User**
   - Click "Join the Coven"
   - Enter email, password, name
   - Select avatar
   - Complete email verification

2. **Set Cooking Persona**
   - Click profile avatar (top right)
   - Switch to "Cooking Persona" tab
   - Select a Cooking Style
   - Select a Magical Specialty
   - Optionally add Favorite Ingredients
   - Click "Update Cooking Persona"
   - Verify success notification

3. **Generate Recipe**
   - Go to Recipe Cauldron
   - Notice your avatar and name appear
   - Generate a recipe
   - Recipe should reflect your magical specialty

4. **Test Persistence**
   - Refresh the page
   - Click profile avatar
   - Verify Cooking Persona data is still there
   - Close and reopen browser
   - Sign in again
   - Verify all data persists

---

## Step 3: Production Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Amplify Hosting
```bash
# If using Amplify CLI
amplify publish

# Or commit and push (if using Git-based deployment)
git add .
git commit -m "Implement unified profile system (Option A)"
git push origin main
```

---

## 🔍 Troubleshooting

### Issue: "Cannot read property 'custom:cookingStyle'"
**Cause**: Backend not deployed yet  
**Fix**: Run `npx ampx sandbox --once`

### Issue: "Failed to update user attributes"
**Cause**: Custom attributes not in Cognito schema  
**Fix**: 
1. Check `amplify/auth/resource.ts` has the custom attributes
2. Redeploy with `npx ampx sandbox --once`
3. Check AWS Console → Cognito → User Pools → Attributes

### Issue: Cooking Persona doesn't save
**Cause**: Check browser console for errors  
**Fix**:
1. Verify `amplify_outputs.json` is up to date
2. Check AWS Cognito permissions
3. Try signing out and back in

### Issue: Old users have no cooking persona
**Expected behavior**: New fields are optional  
**Solution**: 
- Add a banner: "Complete your cooking persona for personalized recipes!"
- Make it skippable but show periodically
- Or show on first recipe generation attempt

---

## 📋 Pre-Deployment Checklist

- [ ] Backend deployed with `npx ampx sandbox`
- [ ] `amplify_outputs.json` updated
- [ ] Frontend builds without errors (`npm run build`)
- [ ] Tested signup flow
- [ ] Tested profile updates
- [ ] Tested cooking persona updates
- [ ] Tested recipe generation
- [ ] Tested data persistence (refresh page)
- [ ] Tested sign out/in cycle
- [ ] Checked browser console for errors
- [ ] Verified AWS Cognito has custom attributes

---

## 🎯 Quick Start (Development)

```bash
# 1. Deploy backend
npx ampx sandbox --once

# 2. Wait for completion (1-2 minutes)
# Look for: "✔ Deployment completed"

# 3. Start dev server
npm run dev

# 4. Test in browser
# Open http://localhost:5173
# Sign up as new user
# Complete profile + cooking persona
# Generate a recipe
```

---

## 📊 AWS Cognito Verification

### Check Custom Attributes Created
1. Go to AWS Console
2. Navigate to Amazon Cognito
3. Select your User Pool
4. Click "Sign-in experience" tab
5. Scroll to "Attribute verification and requirements"
6. Verify you see:
   - `custom:cookingStyle`
   - `custom:magicalSpecialty`
   - `custom:favoriteIngredients`

### Check User Attributes (After Testing)
1. Go to your User Pool
2. Click "Users" tab
3. Select a test user
4. Click "User attributes" section
5. Verify custom attributes have values

---

## 🔄 Rollback Plan (If Needed)

If something goes wrong:

```bash
# 1. Checkout previous version
git checkout HEAD~1

# 2. Redeploy backend
npx ampx sandbox --once

# 3. Rebuild frontend
npm run build

# 4. Deploy
amplify publish
```

Or use Git revert:
```bash
git revert HEAD
git push origin main
```

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ New users can set their cooking persona
- ✅ Profile modal has two tabs (Profile and Cooking Persona)
- ✅ Cooking persona data persists across page refreshes
- ✅ Recipe builder shows user's name and avatar
- ✅ Generated recipes mention the user's magical specialty
- ✅ No "Character" button in header
- ✅ No console errors
- ✅ AWS Cognito shows custom attributes in user records

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check network tab for API call failures
3. Verify `amplify_outputs.json` is current
4. Check AWS Cognito User Pool configuration
5. Review this file's troubleshooting section

Happy cooking! 🧙‍♀️✨
