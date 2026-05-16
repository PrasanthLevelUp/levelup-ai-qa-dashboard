export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

interface ParsedTestCase {
  id: string;
  title: string;
  steps: string;
  expectedResult: string;
  priority: string;
  module: string;
  scenario: string; // AI-ready combined description
}

/**
 * Parse uploaded CSV/Excel file and extract test cases.
 * Supports various column names and formats.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        { success: false, error: 'Only CSV and Excel (.xlsx/.xls) files are supported' },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json(
        { success: false, error: 'File contains no sheets' },
        { status: 400 }
      );
    }

    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet!, { defval: '' });

    if (rawData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File contains no data rows' },
        { status: 400 }
      );
    }

    // Detect column mapping (flexible — handles various naming conventions)
    const headers = Object.keys(rawData[0]!).map(h => h.toLowerCase().trim());
    const headerMap = Object.keys(rawData[0]!);

    const findCol = (patterns: string[]) => {
      for (const pattern of patterns) {
        const idx = headers.findIndex(h => h.includes(pattern));
        if (idx >= 0) return headerMap[idx]!;
      }
      return null;
    };

    const idCol = findCol(['id', 'test id', 'case id', 'tc_id', 'tc id', '#', 'no', 'sr']);
    const titleCol = findCol(['title', 'name', 'summary', 'test case', 'test name', 'scenario', 'description']);
    const stepsCol = findCol(['steps', 'test steps', 'step', 'procedure', 'action', 'instructions']);
    const expectedCol = findCol(['expected', 'expected result', 'result', 'outcome', 'verification', 'assert']);
    const priorityCol = findCol(['priority', 'severity', 'importance', 'level']);
    const moduleCol = findCol(['module', 'component', 'feature', 'area', 'section', 'page', 'category']);

    if (!titleCol && !stepsCol) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not detect test case columns. Found headers: ${headerMap.join(', ')}. Expected columns like: Title/Name, Steps, Expected Result`,
          detectedHeaders: headerMap,
        },
        { status: 400 }
      );
    }

    // Parse test cases
    const testCases: ParsedTestCase[] = rawData.map((row, idx) => {
      const id = idCol ? String(row[idCol] || `TC-${idx + 1}`) : `TC-${idx + 1}`;
      const title = titleCol ? String(row[titleCol] || '') : '';
      const steps = stepsCol ? String(row[stepsCol] || '') : '';
      const expectedResult = expectedCol ? String(row[expectedCol] || '') : '';
      const priority = priorityCol ? String(row[priorityCol] || 'Medium') : 'Medium';
      const module = moduleCol ? String(row[moduleCol] || '') : '';

      // Build AI-ready scenario from all available fields
      const scenarioParts: string[] = [];
      if (title) scenarioParts.push(title);
      if (steps) scenarioParts.push(`Steps: ${steps}`);
      if (expectedResult) scenarioParts.push(`Expected: ${expectedResult}`);

      return {
        id,
        title,
        steps,
        expectedResult,
        priority,
        module,
        scenario: scenarioParts.join('. ') || `Test case ${id}`,
      };
    }).filter(tc => tc.title || tc.steps); // Remove empty rows

    // Group by module if available
    const modules = [...new Set(testCases.map(tc => tc.module).filter(Boolean))];

    console.log(`[ParseUpload] Parsed ${testCases.length} test cases from ${file.name} (${modules.length} modules)`);

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        totalRows: rawData.length,
        parsedCount: testCases.length,
        columns: {
          id: idCol,
          title: titleCol,
          steps: stepsCol,
          expected: expectedCol,
          priority: priorityCol,
          module: moduleCol,
        },
        modules,
        testCases,
      },
    });
  } catch (error) {
    console.error('[ParseUpload] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse file', details: String(error) },
      { status: 500 }
    );
  }
}
