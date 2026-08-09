with open('/Users/shlok/.gemini/antigravity-ide/scratch/credline/frontend/src/components/StaggeredMenu.tsx', 'r') as f:
    lines = f.readlines()

# The wrongly inserted block is from line 108 to 265 (inclusive)
# Let's verify by checking the lines:
inserted_block = lines[107:265]  # Python is 0-indexed, so 107 is line 108. Wait, is it?
# Let's just find the indices dynamically to be 100% safe.

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "return (" in line and "sm-scope" in lines[i+1] and start_idx == -1:
        start_idx = i
        break

# Find where the inserted block ends. It ends at `    );` before `    }, [menuButtonColor, position]);`
for i in range(start_idx, len(lines)):
    if "    }, [menuButtonColor, position]);" in lines[i]:
        end_idx = i - 1
        break

inserted_jsx = lines[start_idx:end_idx+1]

# The original useLayoutEffect close:
fix_use_layout = "        });\n        return () => ctx.revert();\n    }, [menuButtonColor, position]);\n"

# Now find the old return block at the bottom
old_return_start = -1
for i in range(end_idx + 2, len(lines)):
    if "return (" in lines[i] and "sm-scope" in lines[i+1]:
        old_return_start = i
        break

old_return_end = -1
for i in range(old_return_start, len(lines)):
    if "};" in lines[i] and "export default" in lines[i+2]:
        old_return_end = i - 1
        break

if start_idx != -1 and old_return_start != -1:
    new_lines = lines[:start_idx] + [fix_use_layout] + lines[end_idx+2:old_return_start] + inserted_jsx + lines[old_return_end+1:]
    with open('/Users/shlok/.gemini/antigravity-ide/scratch/credline/frontend/src/components/StaggeredMenu.tsx', 'w') as f:
        f.writelines(new_lines)
    print("Fixed!")
else:
    print(f"Failed to find indices: {start_idx}, {end_idx}, {old_return_start}, {old_return_end}")
