const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = getAllFiles(srcDir);
const extensions = ['.js', '.jsx', '/index.js', '/index.jsx', ''];

let missingFiles = new Set();
let filesChanged = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Regex to match imports: import { ... } from "..." or import x from '...' 
  const importRegex = /(import\s+[\s\S]*?\s+from\s+['"])([^'"]+)(['"])/g;
  
  content = content.replace(importRegex, (match, p1, importPath, p3) => {
    // Only resolve relative paths, or paths that are already wrong
    if (importPath.startsWith('.')) {
      let resolvedAbs = path.resolve(path.dirname(file), importPath);
      
      // Attempt to find the exact file to see its true location if possible
      let foundFile = resolvedAbs;
      let exists = false;
      for (const ext of extensions) {
        if (fs.existsSync(resolvedAbs + ext) && !fs.statSync(resolvedAbs + ext).isDirectory()) {
          foundFile = resolvedAbs + ext;
          exists = true;
          break;
        }
      }

      // If it doesn't exist, it might be a broken import from before. Let's still try to map it.
      // Based on rules:
      // Map Room/Video to @features/classroom/
      let newAliasPath = importPath;
      let filename = path.basename(resolvedAbs);
      
      if (filename.includes('Room') || filename.includes('LiveClassrooms') || importPath.includes('Room') || importPath.includes('LiveClassrooms')) {
        let baseName = filename.replace(/\.(js|jsx)$/, '');
        if (baseName === 'index') {
          baseName = path.basename(path.dirname(resolvedAbs));
        }
        newAliasPath = `@features/classroom/${baseName === 'Room' ? 'Room' : 'LiveClassrooms'}`;
        
        // Log if missing
        let classroomDir = path.join(srcDir, 'features', 'classroom');
        if (!fs.existsSync(classroomDir) || !fs.existsSync(path.join(classroomDir, baseName + '.jsx'))) {
          missingFiles.add(`@features/classroom/${baseName}`);
        }
      } else {
        // Default Alias mapping based on absolute path inside src
        let relToSrc = path.relative(srcDir, foundFile).replace(/\\/g, '/');
        // remove extension for neatness
        relToSrc = relToSrc.replace(/\.(js|jsx)$/, '');
        // remove trailing /index
        relToSrc = relToSrc.replace(/\/index$/, '');
        
        if (relToSrc.startsWith('components/')) {
          newAliasPath = '@components/' + relToSrc.replace('components/', '');
        } else if (relToSrc.startsWith('features/')) {
          newAliasPath = '@features/' + relToSrc.replace('features/', '');
        } else if (relToSrc.startsWith('services/')) {
          newAliasPath = '@services/' + relToSrc.replace('services/', '');
        } else if (relToSrc.startsWith('context/')) {
          newAliasPath = '@context/' + relToSrc.replace('context/', '');
        } else if (relToSrc.startsWith('utils/')) {
          newAliasPath = '@utils/' + relToSrc.replace('utils/', '');
        } else if (relToSrc.startsWith('hooks/')) {
          newAliasPath = '@hooks/' + relToSrc.replace('hooks/', '');
        } else {
          newAliasPath = '@/' + relToSrc;
        }
      }

      return `${p1}${newAliasPath}${p3}`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    filesChanged++;
  }
});

console.log(`Updated imports in ${filesChanged} files.`);
if (missingFiles.size > 0) {
  console.log("MISSING FILES:");
  missingFiles.forEach(m => console.log(m));
} else {
  console.log("No missing requested files.");
}
