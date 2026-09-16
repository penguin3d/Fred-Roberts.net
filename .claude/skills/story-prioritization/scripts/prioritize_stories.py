import sys
import re
import os
import glob
import yaml

def calculate_priority_score(text):
    text = text.lower()
    score = 0
    
    # Tier 1: Infrastructure & Core (Highest Priority)
    if any(x in text for x in ['foundation', 'infrastructure', 'setup', 'config', 'schema', 'database', 'collection', 'auth', 'security', 'core', 'initial', 'scaffold']):
        score += 10000
    
    # Tier 2: Backend Logic & Data Flow
    if any(x in text for x in ['api', 'endpoint', 'service', 'controller', 'backend', 'logic', 'handling', 'webhook', 'integration', 'processing']):
        score += 1000

    # Tier 3: Feature Implementation (Business Rules)
    if any(x in text for x in ['implement', 'create', 'add functionality', 'develop', 'workflow', 'calculation', 'engine']):
        score += 100
        
    # Tier 4: UI/UX (Usually dependent on backend)
    if any(x in text for x in ['ui', 'frontend', 'component', 'page', 'screen', 'view', 'display', 'form', 'dialog', 'modal']):
        score += 10
        
    # Tier 5: Refinement & Polish
    if any(x in text for x in ['style', 'css', 'refactor', 'optimize', 'clean', 'update', 'fix', 'polish', 'animation']):
        score += 1
        
    return score

def parse_yaml_stories(directory_path, legacy_markdown=False):
    if legacy_markdown:
        return parse_markdown_stories(directory_path)
        
    stories = []
    # Find all .yaml files in the directory
    yaml_files = glob.glob(os.path.join(directory_path, '*.yaml'))
    
    for file_path in yaml_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
                
            # Validate it's a user story
            if data.get('type') != 'user_story':
                continue
                
            title = data.get('title', '')
            story_id = data.get('id', os.path.basename(file_path))
            
            # Combine content for scoring
            raw_text = f"{title} {data.get('description', '')} {data.get('notes', '')}"
            
            stories.append({
                'id': story_id,
                'title': title,
                'file_path': file_path,
                'file_name': os.path.basename(file_path),
                'raw_text': raw_text,
                'data': data
            })
            
        except Exception as e:
            print(f"Skipping {file_path}: {e}")
            
    return stories

def parse_markdown_stories(file_path):
    # ... legacy support ...
    stories = []
    current_story = None
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for line in lines:
        match = re.match(r'^\s*-\s*\[([ xy])\]\s+(.*)', line)
        if match:
            if current_story:
                stories.append(current_story)
            status_char = match.group(1)
            title = match.group(2).strip()
            id_match = re.search(r'\*\*Story\s+([\d\.]+):?\*\*', title)
            story_id = id_match.group(1) if id_match else "Unnumbered"
            
            current_story = {
                'id': story_id,
                'title': title,
                'content': [line],
                'raw_text': title
            }
        elif current_story:
             if line.strip() == '' or line.startswith('  ') or line.startswith('\t'):
                current_story['content'].append(line)
                current_story['raw_text'] += " " + line.strip()
             elif line.startswith('#'):
                stories.append(current_story)
                current_story = None
             else:
                stories.append(current_story)
                current_story = None
                
    if current_story:
        stories.append(current_story)
    return stories

def main():
    if len(sys.argv) < 2:
        print("Usage: python prioritize_stories.py <stories_dir_or_file> [output_file]")
        sys.exit(1)
        
    input_path = sys.argv[1]
    
    # Determine mode
    is_markdown = input_path.endswith('.md')
    if is_markdown:
        output_file = sys.argv[2] if len(sys.argv) > 2 else input_path.replace('.md', '_prioritized.md')
        stories = parse_yaml_stories(input_path, legacy_markdown=True)
    else:
        # Directory mode
        if len(sys.argv) > 2:
             output_file = sys.argv[2]
        else:
             # Default to parent dir
             parent = os.path.dirname(input_path.rstrip(os.sep))
             output_file = os.path.join(parent, 'prioritized_backlog.md')

        stories = parse_yaml_stories(input_path, legacy_markdown=False)

    for story in stories:
        story['score'] = calculate_priority_score(story['raw_text'])
    
    # Sort
    stories.sort(key=lambda x: (-x['score'], x['id']))
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# Prioritized Story Backlog\n")
        f.write(f"**Source:** {input_path}\n")
        f.write("**Logic:** Foundation > Backend > Feature > UI > Refine\n\n")

        # Function to write sections
        def write_section(label, min_score, max_score):
            f.write(f"\n## {label}\n")
            section_stories = [s for s in stories if min_score <= s['score'] < max_score]
            if not section_stories:
                f.write("_No stories in this tier._\n")
                return
            
            if is_markdown:
                for s in section_stories:
                    f.writelines(s['content'])
            else:
                # YAML Table format
                f.write("| Score | ID | Title | File |\n")
                f.write("|-------|----|-------|------|\n")
                for s in section_stories:
                    f.write(f"| {s['score']} | {s['id']} | {s['title']} | `{s['file_name']}` |\n")

        write_section("High Priority (Foundation & Setup)", 10000, 999999)
        write_section("Medium Priority (Features & Logic)", 1000, 10000)
        write_section("Standard Priority (UI & Implementation)", 0, 1000)
        
        # For YAML mode, add Execution Tracker Snippet
        if not is_markdown:
            f.write("\n\n---\n")
            f.write("## 📋 Execution Tracker YAML Snippet\n")
            f.write("Copy this block into `execution-tracker.yaml` under `execution_plan`:\n\n")
            f.write("```yaml\n")
            f.write("execution_plan:\n")
            for i, s in enumerate(stories, 1):
                f.write(f"  - sequence: {i}\n")
                f.write(f"    id: \"{s['id']}\"\n")
                f.write(f"    title: \"{s['title']}\"\n")
                f.write(f"    status: \"pending\"\n")
                f.write(f"    file: \"stories/{s['file_name']}\"\n")
                f.write(f"    priority_score: {s['score']}\n")
            f.write("```\n")

    print(f"Successfully prioritized {len(stories)} stories.")
    print(f"Output written to: {output_file}")

if __name__ == "__main__":
    main()
