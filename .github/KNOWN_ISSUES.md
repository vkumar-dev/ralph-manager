# Known Issues

## 📸 Screenshot Utility Issue (WSL)

**Status:** Known Limitation

### Description
When running Ralph Manager in WSL (Windows Subsystem for Linux), Linux screenshot utilities cannot capture the Electron window properly because the GUI is rendered by Windows, not the WSL environment.

### Impact
- Automated screenshots in scripts will produce black/empty images
- Linux screenshot tools (gnome-screenshot, flameshot, scrot, import) don't work

### Workaround
To capture screenshots of the Ralph Manager GUI:

1. **Using Windows Snipping Tool:**
   - Press `Win + Shift + S`
   - Select the Ralph Manager window
   - Save to `public/screenshot.png` in the project folder

2. **Using Print Screen:**
   - Press `PrtScn` or `Alt + PrtScn`
   - Paste into Paint or image editor
   - Save to project folder

3. **Using Snip & Sketch:**
   - Press `Win + Shift + S`
   - Capture the window
   - Save the screenshot

### For Developers
If you want to contribute a screenshot for the README:

```bash
# After capturing screenshot using Windows tools
cp public/screenshot.png docs/screenshot.png
git add public/screenshot.png docs/screenshot.png
git commit -m "Add GUI screenshot"
git push
```

### Future Improvements
- Add documentation about WSL limitations to README
- Consider adding a Windows-compatible screenshot script
- Add placeholder image for documentation

---

## 🐛 Reporting New Bugs

Found a different bug? Please [open an issue](https://github.com/vkumar-dev/ralph-manager/issues/new/choose) with:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node.js version, app version)
- Screenshots if applicable
