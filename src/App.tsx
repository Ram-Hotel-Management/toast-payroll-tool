import React, { useState, useRef } from "react";
import { Upload } from "lucide-react";
import "./App.css";

// Map department codes
const deptMap: Record<string, string> = {
  "212": "BARTEND",
  "311": "TSERVER",
  "211": "SERVER",
  "227": "STEWARD",
  "225": "PIZZA",
  "224": "LINE",
  "226": "PREP",
  "213": "HOST",
  "223": "SAUTE",
  "214": "RUNNER",
  "37": "EVENT",
};

interface EmployeeJobHours {
  id: string;
  regularHours: number;
  overtimeHours: number;
  dept: string;
  normalRate: number;
}

const MAX_ROWS = 5000;

// CSV Parser that handles quoted fields
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      // End of field
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      // End of row
      if (char === "\r" && nextChar === "\n") {
        i++; // Skip \n in \r\n
      }
      currentRow.push(currentField);
      if (currentRow.length > 0 && currentRow.some((f) => f !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Add last field and row if exists
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
};

function process_employee_hours_file(
  e: ProgressEvent<FileReader>
): EmployeeJobHours[] {
  const data = e.target?.result as string;
  const lines = parseCSV(data);

  // Determine number of rows
  let row_count = Math.min(MAX_ROWS, lines.length);

  let header = lines[0].map((cell) => cell.trim().toLowerCase());
  const employee_id_col_index = header.indexOf("employee id") || 14;
  const reg_hours_col_index = header.indexOf("regular hours") || 2;
  const ot_hours_col_index = header.indexOf("overtime hours") || 3;
  const job_code_col_index = header.indexOf("job code") || 15;
  const normal_rate_col_index = header.indexOf("normal rate") || 4;

  let employeeHours: EmployeeJobHours[] = [];
  for (let x = 1; x < row_count; x++) {
    // quoted cells
    const cells = lines[x].map((cell) => cell.trim());
    if (
      !cells[employee_id_col_index] &&
      cells[employee_id_col_index].trim() == ""
    ) {
      throw new Error(
        `[LABOR] Employee ID missing for row ${x + 1}\nPlease correct and retry`
      );
    }

    // dept must be mapped
    let dept = cells[job_code_col_index];
    dept = deptMap[dept];

    if (!dept) {
      alert(cells);
      throw new Error(
        `[LABOR] Invalid Job Code for row ${x + 1}\nPlease correct and retry`
      );
    }

    employeeHours.push({
      id: cells[employee_id_col_index],
      regularHours: parseFloat(cells[reg_hours_col_index]) || 0,
      overtimeHours: parseFloat(cells[ot_hours_col_index]) || 0,
      dept: dept,
      normalRate: parseFloat(cells[normal_rate_col_index]) || 0,
    });
  }

  return employeeHours;
}

const job_dept_map: Record<string, string> = {
  "Food Runner": "RUNNER",
  Server: "SERVER",
  Bartender: "BARTEND",
  Host: "HOST",
  Steward: "STEWARD",
  "Training Server": "TSERVER",
};

// tips includes both tips and gratuity
interface EmployeeTips {
  id: string;
  dept: string;
  tips: number;
}

function process_tips_file(e: ProgressEvent<FileReader>): EmployeeTips[] {
  const data = e.target?.result as string;
  const lines = parseCSV(data);

  // Determine number of rows
  let row_count = Math.min(MAX_ROWS, lines.length);
  let header = lines[0].map((cell) => cell.trim().toLowerCase());
  const employee_id_col_index = header.indexOf("employee id") || 0;
  const dept_col_index = header.indexOf("job") || 2;
  const tips_col_index =
    header.indexOf("tips and gratuity after pooling") || 18;

  let employeeTips: EmployeeTips[] = [];

  for (let x = 1; x < row_count; x++) {
    const cells = lines[x].map((cell) => cell.trim());
    if (
      !cells[employee_id_col_index] &&
      cells[employee_id_col_index].trim() == ""
    ) {
      throw new Error(
        `[TIPS] Employee ID missing for row ${x + 1}\nPlease correct and retry`
      );
    }

    // dept must be mapped
    let dept = cells[dept_col_index];
    dept = job_dept_map[dept];

    if (!dept) {
      throw new Error(
        `[TIPS] Invalid Job for row ${x + 1}\nPlease correct and retry`
      );
    }

    employeeTips.push({
      id: cells[employee_id_col_index],
      dept: dept,
      tips: parseFloat(cells[tips_col_index]) || 0,
    });
  }

  return employeeTips;
}

const EmployeHours: React.FC<EmployeeTipsProps> = ({ file, setFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Employee Labor Summary File
      </label>
      <div className="flex items-center space-x-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          hidden
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Upload size={20} />
          <span>Choose File</span>
        </button>
        {file && <span className="text-sm text-gray-600">{file.name}</span>}
      </div>
    </div>
  );
};

interface EmployeeTipsProps {
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
}

const EmployeeTipsComponent: React.FC<EmployeeTipsProps> = ({
  file,
  setFile,
}) => {
  // const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Employee Tips & Gratuity File
      </label>
      <div className="flex items-center space-x-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          hidden
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Upload size={20} />
          <span>Choose File</span>
        </button>
        {file && <span className="text-sm text-gray-600">{file.name}</span>}
      </div>
    </div>
  );
};

interface FinalOutput {
  employee_id: number;
  type: string;
  hours?: number;
  rate?: number;
  amount?: number;
  dept: string;
}

const App: React.FC = () => {
  let [employeeHoursFile, setEmployeeHoursFile] = useState<File | null>(null);
  let [employeeTipsFile, setEmployeeTipsFile] = useState<File | null>(null);

  let output = [] as FinalOutput[];

  const process = () => {
    if (!employeeHoursFile || !employeeTipsFile) {
      alert("Please select both files before processing.");
      return;
    }

    output = [];
    let completed = true;

    const reader1 = new FileReader();
    reader1.onload = (e) => {
      let employeeHours: EmployeeJobHours[] = [];
      try {
        employeeHours = process_employee_hours_file(e);

        for (let emp of employeeHours) {
          // Regular Hours
          output.push({
            employee_id: parseInt(emp.id),
            type: "REG",
            hours: emp.regularHours,
            rate: emp.normalRate,
            amount: parseFloat((emp.regularHours * emp.normalRate).toFixed(2)),
            dept: emp.dept,
          });

          // Overtime Hours
          output.push({
            employee_id: parseInt(emp.id),
            type: "OT",
            hours: emp.overtimeHours,
            rate: emp.normalRate,
            dept: emp.dept,
          });
        }
      } catch (error: any) {
        completed = false;
        alert(error.message);
        return;
      }
    };

    reader1.readAsText(employeeHoursFile);

    const reader2 = new FileReader();
    reader2.onload = (e) => {
      let employeeTips: EmployeeTips[] = [];
      try {
        employeeTips = process_tips_file(e);

        for (let tip of employeeTips) {
          output.push({
            employee_id: parseInt(tip.id),
            type: "TPCRRS",
            amount: parseFloat(tip.tips.toFixed(2)),
            dept: tip.dept,
          });
        }
      } catch (error: any) {
        completed = false;
        alert(error.message);
        return;
      }
    };

    reader2.readAsText(employeeTipsFile);

    reader2.onloadend = () => {
      if (!completed) {
        return;
      }

      // All processing done, prepare CSV for download
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "employee_id,type,hours,rate,amount,dept\n";

      output.forEach((row) => {
        const rowArray = [
          row.employee_id,
          row.type,
          row.hours !== undefined ? row.hours : "",
          row.rate !== undefined ? row.rate : "",
          row.amount !== undefined ? row.amount : "",
          row.dept,
        ];
        csvContent += rowArray.join(",") + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "processed_payroll.csv");
      document.body.appendChild(link); // Required for FF

      link.click();
    };
  };

  return (
    <div className="p-20">
      <h1 className="text-3xl font-bold mb-8">
        Toast Payroll Tool (Olivine Only)
      </h1>
      <EmployeHours file={employeeHoursFile} setFile={setEmployeeHoursFile} />
      <EmployeeTipsComponent
        file={employeeTipsFile}
        setFile={setEmployeeTipsFile}
      />

      <button
        onClick={process}
        className="mt-10 w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        disabled={!employeeHoursFile || !employeeTipsFile}
      >
        Process Files & download files
      </button>
    </div>
  );
};

export default App;
