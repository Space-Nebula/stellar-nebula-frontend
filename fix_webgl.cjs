const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'components', 'Canvas', 'NebulaCanvas.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Find and replace the target section
const old = `      </Suspense>
      </Canvas>

      {/* Keyboard-accessible scan controls overlay - visible for keyboard navigation */}`;

const newContent = `      </Suspense>
      </Canvas>

      <WebGlFallback
        alternatives={[
          'Use a browser with WebGL support',
          'Update your graphics drivers',
          'Try a different device',
        ]}
        onRetry={() => window.location.reload()}
      />

      {/* Keyboard-accessible scan controls overlay - visible for keyboard navigation */}`;

if (content.includes(old)) {
  const newFileContent = content.replace(old, newContent);
  fs.writeFileSync(filePath, newFileContent, 'utf8');
  console.log('Successfully replaced WebGL fallback section');
} else {
  console.log('Old string not found');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('</Suspense>') && lines[i+1].includes('</Canvas>')) {
      console.log(`Found at line ${i+1}:`);
      console.log(lines.slice(i, i+5).join('\n'));
      break;
    }
  }
}