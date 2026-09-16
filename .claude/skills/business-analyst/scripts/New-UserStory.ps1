<#
.SYNOPSIS
    Generates a user story YAML file from input parameters.

.DESCRIPTION
    Creates a structured user story in YAML format following the standard:
    As a [role], I want [feature], So that [benefit]
    Includes acceptance criteria in Gherkin format (Given/When/Then).

.PARAMETER StoryId
    Unique identifier for the story (e.g., "US-001")

.PARAMETER Title
    Brief descriptive title for the story

.PARAMETER EpicId
    Parent epic identifier

.PARAMETER Role
    The user role/persona (the "As a" part)

.PARAMETER Want
    What the user wants to achieve (the "I want" part)

.PARAMETER SoThat
    The business value/benefit (the "So that" part)

.PARAMETER Priority
    MoSCoW priority: Must, Should, Could, Won't

.PARAMETER StoryPoints
    Estimated story points

.PARAMETER Sprint
    Target sprint identifier

.PARAMETER OutputPath
    Directory to save the YAML file (defaults to current directory)

.PARAMETER AcceptanceCriteria
    Array of hashtables with Given/When/Then acceptance criteria

.PARAMETER BusinessRules
    Array of business rules as strings

.EXAMPLE
    New-UserStory -StoryId "US-001" -Title "User Login" -EpicId "EPIC-001" `
        -Role "registered user" -Want "to log in with my credentials" `
        -SoThat "I can access my personalized dashboard" -Priority "Must" `
        -StoryPoints 5

.EXAMPLE
    # With acceptance criteria
    $ac = @(
        @{ Given = "valid credentials"; When = "user submits login form"; Then = "user is redirected to dashboard" },
        @{ Given = "invalid credentials"; When = "user submits login form"; Then = "error message is displayed" }
    )
    New-UserStory -StoryId "US-001" -Title "User Login" -EpicId "EPIC-001" `
        -Role "registered user" -Want "to log in" -SoThat "I can access my account" `
        -AcceptanceCriteria $ac
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$StoryId,

    [Parameter(Mandatory = $true)]
    [string]$Title,

    [Parameter(Mandatory = $false)]
    [string]$EpicId = "",

    [Parameter(Mandatory = $true)]
    [string]$Role,

    [Parameter(Mandatory = $true)]
    [string]$Want,

    [Parameter(Mandatory = $true)]
    [string]$SoThat,

    [Parameter(Mandatory = $false)]
    [ValidateSet("Must", "Should", "Could", "Won't")]
    [string]$Priority = "Should",

    [Parameter(Mandatory = $false)]
    [int]$StoryPoints = 0,

    [Parameter(Mandatory = $false)]
    [string]$Sprint = "",

    [Parameter(Mandatory = $false)]
    [string]$OutputPath = ".",

    [Parameter(Mandatory = $false)]
    [array]$AcceptanceCriteria = @(),

    [Parameter(Mandatory = $false)]
    [string[]]$BusinessRules = @(),

    [Parameter(Mandatory = $false)]
    [string[]]$TechnicalNotes = @(),

    [Parameter(Mandatory = $false)]
    [string[]]$DependsOn = @(),

    [Parameter(Mandatory = $false)]
    [string[]]$Blocks = @(),

    [Parameter(Mandatory = $false)]
    [string]$Author = $env:USERNAME
)

function ConvertTo-YamlString {
    param([string]$Value)
    
    # Always wrap in quotes for safety in YAML
    if ([string]::IsNullOrEmpty($Value)) {
        return '""'
    }
    
    $escaped = $Value.Replace('\', '\\').Replace('"', '\"')
    return "`"$escaped`""
}

function Format-YamlArray {
    param(
        [string[]]$Items,
        [int]$Indent = 2
    )
    
    $indentStr = " " * $Indent
    if ($Items.Count -eq 0) {
        return "[]"
    }
    
    $lines = $Items | ForEach-Object { "${indentStr}- $(ConvertTo-YamlString $_)" }
    return "`n$($lines -join "`n")"
}

$currentDate = Get-Date -Format "yyyy-MM-dd"

# Build acceptance criteria YAML
$acYaml = ""
if ($AcceptanceCriteria.Count -gt 0) {
    $acLines = @()
    $acIndex = 1
    foreach ($ac in $AcceptanceCriteria) {
        $acId = "AC-$('{0:D3}' -f $acIndex)"
        $acLines += "  - id: `"$acId`""
        $acLines += "    given: $(ConvertTo-YamlString $ac.Given)"
        $acLines += "    when: $(ConvertTo-YamlString $ac.When)"
        $acLines += "    then: $(ConvertTo-YamlString $ac.Then)"
        $acLines += ""
        $acIndex++
    }
    $acYaml = $acLines -join "`n"
}
else {
    $acYaml = @"
  - id: "AC-001"
    given: "[precondition or context]"
    when: "[action performed]"
    then: "[expected outcome]"
"@
}

# Build business rules YAML
$brYaml = ""
if ($BusinessRules.Count -gt 0) {
    $brLines = @()
    $brIndex = 1
    foreach ($br in $BusinessRules) {
        $brId = "BR-$('{0:D3}' -f $brIndex)"
        $brLines += "  - id: `"$brId`""
        $brLines += "    rule: $(ConvertTo-YamlString $br)"
        $brLines += "    validation: `"[How to validate this rule]`""
        $brLines += ""
        $brIndex++
    }
    $brYaml = $brLines -join "`n"
}
else {
    $brYaml = "  []"
}

# Build technical notes YAML
$techYaml = if ($TechnicalNotes.Count -gt 0) {
    ($TechnicalNotes | ForEach-Object { "  - $(ConvertTo-YamlString $_)" }) -join "`n"
}
else {
    "  []"
}

# Build dependencies YAML
$dependsOnYaml = if ($DependsOn.Count -gt 0) {
    "[" + (($DependsOn | ForEach-Object { "`"$_`"" }) -join ", ") + "]"
}
else {
    "[]"
}

$blocksYaml = if ($Blocks.Count -gt 0) {
    "[" + (($Blocks | ForEach-Object { "`"$_`"" }) -join ", ") + "]"
}
else {
    "[]"
}

# Generate YAML content
$yamlContent = @"
# User Story: $StoryId - $Title
# Generated: $currentDate
# Author: $Author

id: "$StoryId"
title: $(ConvertTo-YamlString $Title)
epic_id: "$EpicId"
priority: "$Priority"
story_points: $StoryPoints
sprint: "$Sprint"
status: "Draft"

description:
  as_a: $(ConvertTo-YamlString $Role)
  i_want: $(ConvertTo-YamlString $Want)
  so_that: $(ConvertTo-YamlString $SoThat)

acceptance_criteria:
$acYaml

business_rules:
$brYaml

technical_notes:
$techYaml

dependencies:
  depends_on: $dependsOnYaml
  blocks: $blocksYaml

definition_of_done:
  - "Code complete and reviewed"
  - "Unit tests written and passing"
  - "Acceptance criteria verified"
  - "Documentation updated"
  - "PO sign-off obtained"

metadata:
  created_by: "$Author"
  created_date: "$currentDate"
  last_modified: "$currentDate"
  version: "1.0"
"@

# Ensure output directory exists
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

# Generate filename
$fileName = "$StoryId.yaml"
$fullPath = Join-Path $OutputPath $fileName

# Write file
$yamlContent | Out-File -FilePath $fullPath -Encoding UTF8

Write-Host "✅ User story created: $fullPath" -ForegroundColor Green
Write-Host ""
Write-Host "Story Summary:" -ForegroundColor Cyan
Write-Host "  ID:       $StoryId"
Write-Host "  Title:    $Title"
Write-Host "  Epic:     $EpicId"
Write-Host "  Priority: $Priority"
Write-Host "  As a:     $Role"
Write-Host "  I want:   $Want"
Write-Host "  So that:  $SoThat"

return $fullPath
