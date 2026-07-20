import "./App.css";

import React, { useMemo, useState, useEffect } from "react";
import { Upload, ShieldCheck, Scale, FileText, AlertTriangle, Sparkles, X } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const PRAKAN_CLEAR_LOGO = "/images/logo-prakan-clear.png";
const HERO_FAMILY_IMAGE = "/images/hero-family.png";

const DEMO_ANALYSIS = `📋 ข้อมูลแบบประกัน
บริษัท: 
ชื่อแบบ: 
เบี้ยประกัน: 500,000 บาท/ปี
ระยะเวลาชำระเบี้ย: 10 ปี
ระยะเวลาคุ้มครอง: 20 ปี

✅ ผลประโยชน์รับประกัน
• รับเงินคืนระหว่างสัญญาตามอัตราที่ระบุในเอกสาร
• รับเงินครบสัญญาเมื่ออยู่ครบระยะเวลา
• มีความคุ้มครองชีวิตระหว่างสัญญา

🎁 ผลประโยชน์ไม่รับประกัน
• หากมีเงินปันผล ต้องแยกออกจากผลประโยชน์รับประกัน
• ประวัติเงินปันผลควรพิจารณา 3-5 ปีล่าสุดเป็นหลัก เพราะสภาพดอกเบี้ยในอดีตอาจไม่เหมือนปัจจุบัน

⚠️ ข้อควรรู้
• เงินคืน 5% ไม่ได้แปลว่า IRR 5%
• ควรดูผลตอบแทนจาก Cash Flow ทั้งหมด ไม่ใช่ดูเฉพาะเงินคืนรายปี
• ถ้าต้องการวิเคราะห์แม่นยำ ต้องกรอกตัวเลขจากใบเสนอขายจริง

💡 เหมาะกับผู้ที่
• ต้องการออมเงินระยะยาว
• ต้องการความคุ้มครองชีวิตร่วมกับการออม
• ต้องการแยกเงินปันผลออกจากผลประโยชน์รับประกันให้ชัดเจน

หมายเหตุ: ผลลัพธ์นี้เป็นตัวอย่างการแสดงผล ไม่ใช่คำแนะนำในการซื้อประกัน`;

const FULL_DISCLAIMER = `แพลตฟอร์มนี้เป็นเพียงเครื่องมือช่วยคำนวณและสรุปข้อมูลเบื้องต้นเพื่ออำนวยความสะดวกเท่านั้น ไม่ใช่เอกสารเสนอขายประกันชีวิตอย่างเป็นทางการ และไม่มีส่วนเกี่ยวข้องกับบริษัทประกันภัยใด ๆ ทั้งสิ้น

ผลการคำนวณทั้งหมดขึ้นอยู่กับข้อมูลที่ผู้ใช้กรอกหรืออัปโหลดเข้าสู่ระบบ จึงอาจมีความคลาดเคลื่อนจากข้อมูลจริงได้

เว็บไซต์นี้ไม่มีการขายประกันภัย และไม่เก็บข้อมูลส่วนบุคคลของผู้ใช้งาน

โปรดตรวจสอบรายละเอียด เงื่อนไข ความคุ้มครอง ผลประโยชน์ และข้อยกเว้นต่าง ๆ จากใบเสนอขายและเอกสารของบริษัทประกันภัยโดยตรงก่อนตัดสินใจทุกครั้ง การตัดสินใจใด ๆ ที่เกิดขึ้นจากการใช้งานแพลตฟอร์มนี้ถือเป็นความรับผิดชอบของผู้ใช้งานแต่เพียงผู้เดียว`;

const RULES = [
  "แยกผลประโยชน์รับประกัน / ไม่รับประกัน",
  "เงินปันผลไม่ใช่ผลตอบแทนรับประกัน",
  "เงินคืนรายปีไม่เท่ากับ IRR",
  "ห้ามฟันธงว่าแบบไหนดีที่สุด",
  "ถ้าไม่พบข้อมูล ต้องบอกว่าไม่พบในเอกสาร",
];

function money(n) {
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function npv(rate, cashflows) {
  return cashflows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, i), 0);
}

function irr(cashflows) {
  const hasPos = cashflows.some((v) => v > 0);
  const hasNeg = cashflows.some((v) => v < 0);
  if (!hasPos || !hasNeg) return NaN;

  let low = -0.9999;
  let high = 1;
  while (npv(high, cashflows) > 0 && high < 100) high *= 2;

  for (let i = 0; i < 120; i++) {
    const mid = (low + high) / 2;
    const value = npv(mid, cashflows);
    if (value > 0) low = mid;
    else high = mid;
  }
  return ((low + high) / 2) * 100;
}

function App() {
  const [mode, setMode] = useState("analyze");
  const [company, setCompany] = useState("");
  const [planName, setPlanName] = useState("");
  const [premium, setPremium] = useState(0);
  const [payYears, setPayYears] = useState(0);
  const [totalYears, setTotalYears] = useState(0);
  const [sumAssured, setSumAssured] = useState(0);
  const [cashbackPercent, setCashbackPercent] = useState(0);
  const [cashbackStart, setCashbackStart] = useState(1);
  const [cashbackEnd, setCashbackEnd] = useState(0);
  const [maturity, setMaturity] = useState(0);
  const [dividend, setDividend] = useState(0);
  const [dividendMode, setDividendMode] = useState("single");
  const [annualDividendRows, setAnnualDividendRows] = useState([
    { year: "", amount: "" },
  ]);
  const [maturityBonus, setMaturityBonus] = useState(0);
  const [notes, setNotes] = useState("");
  const [cashbackMode, setCashbackMode] = useState("none"); // none | fixed | range | special
  const [rangeCashbackRows, setRangeCashbackRows] = useState([
    { start: "", end: "", type: "percent", value: "" },
  ]);
  const [specialCashbackRows, setSpecialCashbackRows] = useState([
    { year: "", type: "amount", value: "" },
  ]);
  const [result, setResult] = useState("");
  const [feedback, setFeedback] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [compareFile1, setCompareFile1] = useState(null);
  const [compareFile2, setCompareFile2] = useState(null);
  const [pdfText, setPdfText] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [compareText1, setCompareText1] = useState("");
  const [compareText2, setCompareText2] = useState("");
  const [compareError1, setCompareError1] = useState("");
  const [compareError2, setCompareError2] = useState("");
  const [isExtractingCompare, setIsExtractingCompare] = useState(false);
  const [showRawPdfText, setShowRawPdfText] = useState(false);
  const [showReviewMode, setShowReviewMode] = useState(false);
  const [depositReviewSummary, setDepositReviewSummary] = useState({
    totalDeposits: 0,
    totalInterest: 0,
    endingBalance: 0,
    afterTaxRate: 0
  });

  // Set the worker path for pdfjs using Vite local bundled worker
  // This avoids CDN errors such as "Failed to fetch dynamically imported module"
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }, []);

  const extractPdfText = async (file) => {
    if (!file || file.type !== "application/pdf") {
      setPdfError("");
      return;
    }

    setIsExtractingPdf(true);
    setPdfError("");
    setPdfText("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += pageText + "\n";
      }

      setPdfText(fullText || "ไม่พบข้อความในไฟล์ PDF");
      setPdfError("");
    } catch (error) {
      setPdfError(`❌ อ่านไฟล์ PDF ไม่ได้: ${error.message}`);
      setPdfText("");
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const readPdfText = async (file) => {
    if (!file || file.type !== "application/pdf") {
      return "";
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += `--- หน้า ${pageNum} ---\n${pageText}\n\n`;
    }

    return fullText || "ไม่พบข้อความในไฟล์ PDF";
  };

  const extractComparePdfText = async (file, side) => {
    if (!file) return;

    const setText = side === 1 ? setCompareText1 : setCompareText2;
    const setError = side === 1 ? setCompareError1 : setCompareError2;

    setText("");
    setError("");

    if (file.type !== "application/pdf") {
      setText("ไฟล์นี้เป็นรูปภาพ ในเวอร์ชันถัดไปต้องใช้ OCR หรือ GPT Vision เพื่ออ่านข้อความจากรูปภาพ");
      return;
    }

    setIsExtractingCompare(true);

    try {
      const text = await readPdfText(file);
      setText(text);
    } catch (error) {
      setError(`❌ อ่านไฟล์ PDF ไม่ได้: ${error.message}`);
      setText("");
    } finally {
      setIsExtractingCompare(false);
    }
  };

  const generateCompareAnalysis = () => {
    const analysis = `📊 ผลเปรียบเทียบแบบประกัน 2 แบบ

📁 แบบที่ 1
ไฟล์: ${compareFile1 ? compareFile1.name : "ยังไม่ได้อัปโหลด"}
ข้อความที่อ่านได้:
${compareText1 ? compareText1.slice(0, 1200) : "ยังไม่มีข้อความจากไฟล์"}

📁 แบบที่ 2
ไฟล์: ${compareFile2 ? compareFile2.name : "ยังไม่ได้อัปโหลด"}
ข้อความที่อ่านได้:
${compareText2 ? compareText2.slice(0, 1200) : "ยังไม่มีข้อความจากไฟล์"}

✅ สิ่งที่ระบบพร้อมทำตอนนี้
• รับไฟล์ PDF ทั้ง 2 แบบ
• อ่านข้อความจาก PDF ทั้ง 2 ฝั่ง
• แสดงข้อมูลเพื่อเตรียมส่งต่อให้ GPT API

⚠️ สิ่งที่ยังต้องต่อเพิ่ม
• GPT API สำหรับสรุปความแตกต่าง
• Rule Engine สำหรับบังคับแยกผลประโยชน์รับประกัน / ไม่รับประกัน
• Auto Extract ตัวเลข เช่น เบี้ย ทุนประกัน เงินคืน เงินครบสัญญา

หมายเหตุ: ผลนี้เป็นโหมดทดสอบการอ่านไฟล์ ยังไม่ใช่การวิเคราะห์จริง`;

    setResult(analysis);
    setFeedback("");
  };

  useEffect(() => {
    if (uploadedFile) {
      extractPdfText(uploadedFile);
    }
  }, [uploadedFile]);

  useEffect(() => {
    if (compareFile1) {
      extractComparePdfText(compareFile1, 1);
    }
  }, [compareFile1]);

  useEffect(() => {
    if (compareFile2) {
      extractComparePdfText(compareFile2, 2);
    }
  }, [compareFile2]);
const cashbackCashflows = useMemo(() => {
    const map = {};
    const addAmount = (year, amount) => {
      const y = Number(year);
      const a = Number(amount);
      if (!Number.isFinite(y) || y <= 0 || !Number.isFinite(a) || a <= 0) return;
      map[y] = (map[y] || 0) + a;
    };

    if (cashbackMode === "none") {
      return map;
    }

    if (cashbackMode === "fixed") {
      const amount = (sumAssured * Number(cashbackPercent || 0)) / 100;
      const startPolicyYear = Number(cashbackStart || 0);
      const endPolicyYear = Number(cashbackEnd || 0);
      for (let policyYear = startPolicyYear; policyYear <= endPolicyYear; policyYear++) {
        addAmount(policyYear, amount);
      }
      return map;
    }

    if (cashbackMode === "range") {
      for (const row of rangeCashbackRows) {
        const start = Number(row.start);
        const end = Number(row.end);
        const value = Number(row.value);
        if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(value) || value <= 0) continue;

        const amount = row.type === "percent" ? (sumAssured * value) / 100 : value;
        for (let policyYear = start; policyYear <= end; policyYear++) {
          addAmount(policyYear, amount);
        }
      }
      return map;
    }

    if (cashbackMode === "special") {
      for (const row of specialCashbackRows) {
        const value = Number(row.value);
        const amount = row.type === "percent" ? (sumAssured * value) / 100 : value;
        addAmount(Number(row.year), amount);
      }
      return map;
    }

    return map;
  }, [cashbackMode, cashbackPercent, cashbackStart, cashbackEnd, sumAssured, rangeCashbackRows, specialCashbackRows]);

  const hasCashback = useMemo(() => {
    return Object.keys(cashbackCashflows).length > 0;
  }, [cashbackCashflows]);

  const updateRangeCashbackRow = (index, key, value) => {
    setRangeCashbackRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const addRangeCashbackRow = () => {
    setRangeCashbackRows((rows) => [...rows, { start: "", end: "", type: "percent", value: "" }]);
  };

  const removeRangeCashbackRow = (index) => {
    setRangeCashbackRows((rows) => rows.filter((_, i) => i !== index));
  };

  const updateSpecialCashbackRow = (index, key, value) => {
    setSpecialCashbackRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const addSpecialCashbackRow = () => {
    setSpecialCashbackRows((rows) => [...rows, { year: "", type: "amount", value: "" }]);
  };

  const removeSpecialCashbackRow = (index) => {
    setSpecialCashbackRows((rows) => rows.filter((_, i) => i !== index));
  };


  const annualDividendCashflows = useMemo(() => {
    const map = {};
    if (dividendMode !== "annual") return map;

    for (const row of annualDividendRows) {
      const year = Number(row.year);
      const amount = Number(row.amount);
      if (!Number.isFinite(year) || year <= 0 || !Number.isFinite(amount) || amount <= 0) continue;
      map[year] = (map[year] || 0) + amount;
    }

    return map;
  }, [dividendMode, annualDividendRows]);

  const updateAnnualDividendRow = (index, key, value) => {
    setAnnualDividendRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const addAnnualDividendRow = () => {
    setAnnualDividendRows((rows) => [...rows, { year: "", amount: "" }]);
  };

  const removeAnnualDividendRow = (index) => {
    setAnnualDividendRows((rows) => rows.filter((_, i) => i !== index));
  };

  const calc = useMemo(() => {
    const rows = [];

    for (let year = 0; year <= totalYears; year++) {
      const paid = year < payYears ? premium : 0;
      const cashback = year >= 1 ? (cashbackCashflows[year] || 0) : 0;
      const mat = year === totalYears ? maturity : 0;
      const div = dividendMode === "annual" ? (annualDividendCashflows[year] || 0) : (year === totalYears ? dividend : 0);
      const bonus = year === totalYears ? maturityBonus : 0;

      rows.push({
        year,
        paid,
        cashback,
        maturity: mat,
        dividend: div,
        bonus,
        guaranteedNet: cashback + mat - paid,
        projectedNet: cashback + mat + div + bonus - paid,
      });
    }

    const guaranteedIRR = irr(rows.map((r) => r.guaranteedNet));
    const projectedIRR = irr(rows.map((r) => r.projectedNet));
    const totalPremium = premium * payYears;
    const totalCashback = rows.reduce((s, r) => s + r.cashback, 0);

    return { rows, guaranteedIRR, projectedIRR, totalPremium, totalCashback };
  }, [premium, payYears, totalYears, maturity, dividend, dividendMode, annualDividendCashflows, maturityBonus, cashbackCashflows]);

  const projectedDividendTotal = (dividendMode === "annual"
    ? Object.values(annualDividendCashflows).reduce((s, v) => s + Number(v || 0), 0)
    : Number(dividend || 0)) + Number(maturityBonus || 0);
  const totalBenefitsReceived = Number(calc.totalCashback || 0) + Number(maturity || 0) + projectedDividendTotal;
  const netDifference = totalBenefitsReceived - Number(calc.totalPremium || 0);

  const generateAnalysis = () => {
    const annualCashback = (sumAssured * cashbackPercent) / 100;
    const cashbackDescription =
      cashbackMode === "none"
        ? "ไม่มีเงินคืนระหว่างสัญญา"
        : cashbackMode === "fixed"
          ? `${money(annualCashback)} บาท/ปี (${cashbackPercent}% ของทุนประกัน) ตั้งแต่ปีที่ ${cashbackStart} ถึงปีที่ ${cashbackEnd}`
          : cashbackMode === "range"
            ? `เงินคืนแบบกำหนดช่วง (${rangeCashbackRows
                .filter((row) => Number(row.start) > 0 && Number(row.end) > 0 && Number(row.value) > 0)
                .map((row) => row.type === "percent"
                  ? `ปี ${row.start}-${row.end}: ${row.value}% ของทุน (${money((sumAssured * Number(row.value)) / 100)} บาท/ปี)`
                  : `ปี ${row.start}-${row.end}: ${money(Number(row.value))} บาท/ปี`
                )
                .join(", ")})`
            : `เงินคืนเฉพาะปี (${specialCashbackRows
                .filter((row) => Number(row.year) > 0 && Number(row.value) > 0)
                .map((row) => row.type === "percent"
                  ? `ปี ${row.year}: ${row.value}% ของทุน (${money((sumAssured * Number(row.value)) / 100)} บาท)`
                  : `ปี ${row.year}: ${money(Number(row.value))} บาท`
                )
                .join(", ")})`;

    const dividendDescription =
      dividendMode === "annual"
        ? `เงินปันผลรายปี (${annualDividendRows
            .filter((row) => Number(row.year) > 0 && Number(row.amount) > 0)
            .map((row) => `ปี ${row.year}: ${money(Number(row.amount))} บาท`)
            .join(", ") || "ยังไม่ได้กรอก"})`
        : `เงินปันผลคาดการณ์เมื่อครบสัญญา ${money(dividend)} บาท`;
    const maturityBonusDescription = Number(maturityBonus) > 0
      ? ` และโบนัสพิเศษเมื่อครบสัญญา ${money(maturityBonus)} บาท`
      : "";
    const totalPremiumPaid = premium * payYears;
    const totalCashbackReceived = calc.totalCashback;
    const totalGuaranteed = totalCashbackReceived + maturity;
    const totalProjected = totalGuaranteed + dividend;
    const guaranteedReturn = totalGuaranteed - totalPremiumPaid;
    const projectedReturn = totalProjected - totalPremiumPaid;

    const analysis = `📋 ข้อมูลแบบประกัน
บริษัท: ${company}
ชื่อแบบ: ${planName}
เบี้ยประกัน: ${money(premium)} บาท/ปี
ระยะเวลาชำระเบี้ย: ${payYears} ปี
ระยะเวลาคุ้มครอง: ${totalYears} ปี
ทุนประกัน: ${money(sumAssured)} บาท

✅ ผลประโยชน์รับประกัน (Guaranteed Benefits)
• รับเงินคืนระหว่างสัญญา: ${cashbackDescription}
• รับเงินครบสัญญาเมื่ออยู่ครบระยะเวลา: ${money(maturity)} บาท ในปีที่ ${totalYears}
• มีความคุ้มครองชีวิตตามทุนประกัน ${money(sumAssured)} บาท ตลอดระยะเวลา

📊 สรุปผลประโยชน์รับประกัน
• รวมเบี้ยที่จ่าย: ${money(totalPremiumPaid)} บาท
• รวมเงินคืนระหว่างทาง: ${money(totalCashbackReceived)} บาท
• เงินครบสัญญา: ${money(maturity)} บาท
• รวมทั้งสิ้น: ${money(totalGuaranteed)} บาท
• ผลตอบแทน (Guaranteed): ${money(guaranteedReturn)} บาท
• IRR (รับประกัน): ${Number.isFinite(calc.guaranteedIRR) ? calc.guaranteedIRR.toFixed(2) : "-"}% ต่อปี

🎁 ผลประโยชน์ไม่รับประกัน (Non-Guaranteed Benefits)
${dividend > 0 ? `• ${dividendDescription}${maturityBonusDescription} (ไม่ได้รับประกัน จากประวัติ 3-5 ปีล่าสุด)
• ผลตอบแทนรวมคาดการณ์: ${money(projectedReturn)} บาท
• IRR (รวมคาดการณ์): ${Number.isFinite(calc.projectedIRR) ? calc.projectedIRR.toFixed(2) : "-"}% ต่อปี` : "• ไม่มีการระบุเงินปันผลคาดการณ์"}
• *** ข้อสำคัญ: เงินปันผลไม่ใช่ผลตอบแทนรับประกัน และอาจเปลี่ยนแปลงตามผลประโยชน์ของบริษัท

⚠️ ข้อควรรู้เรื่องการคำนวณ
• IRR คือผลตอบแทนเฉลี่ยต่อปีจากกระแสเงินสดทั้งหมด ไม่ใช่ % เงินคืนของทุนประกัน\n• เงินคืนที่กรอกไว้ ≠ IRR ${Number.isFinite(calc.guaranteedIRR) ? calc.guaranteedIRR.toFixed(2) : "-"}%
  เหตุผล: IRR คิดจากเงินสดไหลเข้า-ออกทั้งหมด ไม่ใช่ดูเพียงแต่เปอร์เซ็นต์เงินคืนเท่านั้น
• ควรดูผลตอบแทนจาก Cash Flow ทั้งหมด ไม่ใช่ดูเฉพาะเงินคืนรายปี
• ผลลัพธ์นี้ขึ้นอยู่กับข้อมูลที่คุณกรอก หากต้องการวิเคราะห์แม่นยำต้องกรอกข้อมูลจากใบเสนอขายจริง

💡 เหมาะกับผู้ที่
• ต้องการออมเงินระยะยาว โดยมีความคุ้มครองชีวิตด้วย
• ต้องการความชัดเจนในการแยกเงินปันผลออกจากผลประโยชน์รับประกัน
• เป็นส่วนหนึ่งของการวางแผนเงินออมอย่างรอบคอบ
• รู้สึกว่าเงินออมไว้ไม่ปลอดภัยถ้าไม่มีความคุ้มครองชีวิต

${notes ? `📝 หมายเหตุเพิ่มเติม\n${notes}` : ""}

⚖️ ข้อเทียบเท่า
• แบบนี้ไม่ใช่ทางเลือกที่"ดีที่สุด" หรือ"แย่ที่สุด" แต่เป็นตัวเลือกที่ต้องเปรียบเทียบกับความต้องการส่วนตัว
• ควรเปรียบเทียบกับการออมในธนาคาร, กองทุนรวม, หรือแบบประกันอื่นๆ ก่อนตัดสินใจ
• การตัดสินใจควรจำนึกถึงปัจจุบันและอนาคตของคุณ รวมทั้งพูดคุยกับผู้เชี่ยวชาญอื่นๆ ด้วย

หมายเหตุ: ผลลัพธ์นี้เป็นตัวอย่างการแสดงผล ไม่ใช่คำแนะนำในการซื้อประกัน`;
    
    setResult(analysis);
    setFeedback("");
  };


  const downloadReport = () => {
    const reportText = result || "ยังไม่มีผลวิเคราะห์";
    const escapedReport = reportText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>Prakan Clear Report</title>
  <style>
    body { font-family: Arial, "Noto Sans Thai", sans-serif; margin: 0; background: #fff; color: #0f172a; line-height: 1.75; }
    .page { position: relative; max-width: 900px; margin: 0 auto; padding: 42px; min-height: 100vh; overflow: hidden; }
    .watermark { position: fixed; top: 38%; left: 50%; transform: translate(-50%, -50%) rotate(-18deg); font-size: 76px; font-weight: 900; color: rgba(15, 23, 42, 0.055); white-space: nowrap; z-index: 0; pointer-events: none; }
    .content { position: relative; z-index: 1; }
    .brand { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #c8a96e; padding-bottom: 18px; margin-bottom: 24px; }
    .brand img { width: 150px; height: 72px; object-fit: contain; }
    h1 { margin: 0; color: #0f172a; font-size: 30px; }
    .subtitle { color: #475569; margin-top: 6px; }
    pre { white-space: pre-wrap; font-family: inherit; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; font-size: 14px; }
    .disclaimer { margin-top: 24px; padding: 16px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; color: #7c2d12; font-size: 13px; }
    .footer { margin-top: 30px; color: #64748b; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <div class="watermark">Prakan Clear • www.prakanclear.com</div>
    <div class="content">
      <div class="brand">
        <img src="${PRAKAN_CLEAR_LOGO}" alt="Prakan Clear" />
        <div>
          <h1>Prakan Clear</h1>
          <div class="subtitle">วิเคราะห์แบบประกันชีวิตให้เข้าใจง่าย</div>
        </div>
      </div>
      <pre>${escapedReport}</pre>
      <div class="disclaimer">${FULL_DISCLAIMER}</div>
      <div class="footer">Generated by Prakan Clear • www.prakanclear.com</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const safePlan = (planName || "insurance-report").replace(/[^\u0E00-\u0E7Fa-zA-Z0-9-_]/g, "_");
    const a = document.createElement("a");
    a.href = url;
    a.download = `PrakanClear_${safePlan}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page dark-theme" id="home">
      <div className="site-header" style={{
        width: "100%",
        maxWidth: "1180px",
        margin: "0 auto 8px",
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
        padding: "6px 4px"
      }}>
        <a href="#home" style={{
          color: "#07111f",
          background: "#C8A96E",
          borderRadius: "999px",
          padding: "10px 18px",
          fontWeight: 900,
          textDecoration: "none"
        }}>HOME</a>
        <a href="#contact" style={{
          color: "#FFFFFF",
          background: "rgba(8,18,36,0.72)",
          border: "1px solid rgba(200,169,110,0.55)",
          borderRadius: "999px",
          padding: "10px 18px",
          fontWeight: 900,
          textDecoration: "none"
        }}>CONTACT</a>
      </div>

      <div className="top-brand-strip logo-card" style={{
        width: "min(1180px, calc(100vw - 40px))",
        margin: "4px auto 12px",
        padding: "14px 22px",
        borderRadius: "22px",
        border: "1px solid rgba(200,169,110,0.22)",
        background: "rgba(15, 23, 42, 0.72)",
        display: "flex",
        alignItems: "center",
        gap: "18px",
        boxShadow: "0 14px 34px rgba(0,0,0,0.20)"
      }}>
        <img src={PRAKAN_CLEAR_LOGO} alt="PrakanClear" style={{
          width: "108px",
          height: "auto",
          objectFit: "contain",
          flex: "0 0 auto"
        }} />
        <div>
          <div style={{
            color: "#F8FAFC",
            fontWeight: 900,
            fontSize: "1.55rem",
            lineHeight: 1.15
          }}>
            ประกันเคลียร์
          </div>
          <div style={{
            color: "rgba(255,255,255,0.72)",
            fontWeight: 600,
            fontSize: "0.95rem",
            marginTop: "4px"
          }}>
            วิเคราะห์แบบประกันชีวิตให้เข้าใจง่าย
          </div>
        </div>
      </div>


      <style>{`
        body {
          background:
            radial-gradient(circle at 78% 34%, rgba(20,126,137,0.13), transparent 34%),
            radial-gradient(circle at 12% 8%, rgba(201,170,94,0.08), transparent 28%),
            linear-gradient(180deg, #0A1020 0%, #07111D 48%, #030814 100%) !important;
        }
        .dark-theme {
          min-height: 100vh;
          background:
            radial-gradient(circle at 78% 34%, rgba(20,126,137,0.13), transparent 34%),
            radial-gradient(circle at 12% 8%, rgba(201,170,94,0.08), transparent 28%),
            linear-gradient(180deg, #0A1020 0%, #07111D 48%, #030814 100%) !important;
          color: #e5e7eb;
          position: relative;
          overflow-x: hidden;
        }
        .dark-theme::before {
          content: "Prakan Clear";
          position: fixed;
          right: -90px;
          top: 42%;
          transform: rotate(-24deg);
          font-size: 112px;
          font-weight: 900;
          color: rgba(200,169,110,0.035);
          pointer-events: none;
          z-index: 0;
          white-space: nowrap;
        }
        .dark-theme .hero {
          background-color: #020617 !important;
          border-bottom: 1px solid rgba(200,169,110,0.25);
        }
        .dark-theme .brand, .dark-theme .hero-card, .dark-theme .layout, .dark-theme footer { position: relative; z-index: 1; }
        .dark-theme .panel {
          background: rgba(15, 23, 42, 0.94) !important;
          border: 1px solid rgba(200,169,110,0.18);
          box-shadow: 0 18px 50px rgba(0,0,0,0.38);
          color: #e5e7eb;
        }
        .dark-theme h1, .dark-theme h2, .dark-theme h3 { color: #f8fafc !important; }
        .dark-theme .muted, .dark-theme p, .dark-theme label span { color: #cbd5e1 !important; }
        .dark-theme input, .dark-theme textarea {
          background: #020617 !important;
          border: 1px solid rgba(200,169,110,0.35) !important;
          color: #f8fafc !important;
        }
        .dark-theme .upload-box, .dark-theme .cashflow, .dark-theme pre, .dark-theme .rules, .dark-theme .lead {
          background: rgba(2, 6, 23, 0.58) !important;
          border-color: rgba(200,169,110,0.25) !important;
          color: #e5e7eb !important;
        }
        .dark-theme .rule { border-bottom-color: rgba(200,169,110,0.14) !important; color: #e5e7eb !important; }
        .dark-theme .tabs button {
          background: rgba(2, 6, 23, 0.45) !important;
          color: #e5e7eb !important;
          border-color: rgba(200,169,110,0.32) !important;
        }
        .dark-theme .tabs button.active { background: #c8a96e !important; color: #07111f !important; }

        .dark-theme .upload-file-btn,
        .dark-theme label .upload-file-btn,
        .dark-theme button.upload-file-btn {
          background: linear-gradient(135deg, #DDBB68 0%, #C8A96E 45%, #B8872D 100%) !important;
          color: #07111f !important;
          border: 1px solid rgba(126, 83, 20, 0.45) !important;
          box-shadow: 0 8px 18px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35) !important;
          opacity: 1 !important;
          text-shadow: none !important;
        }
        .dark-theme .upload-file-btn:disabled {
          background: linear-gradient(135deg, #D0A74B 0%, #B8872D 100%) !important;
          color: #07111f !important;
          opacity: 0.88 !important;
        }
        .dark-theme .metric {
          background: linear-gradient(135deg, #0f172a, #111827) !important;
          border: 1px solid rgba(200,169,110,0.28);
        }
        .dark-theme .empty { color: #cbd5e1 !important; }
        .dark-theme footer { color: #94a3b8 !important; }

        @media (max-width: 768px) {
          .prakan-responsive-shell {
            display: flex !important;
            flex-direction: column !important;
          }
          .prakan-calculator-panel { order: 1 !important; }
          .result-panel { order: 2 !important; }
          .prakan-presentation-panel { order: 3 !important; }
          #contact { order: 99 !important; }
          .prakan-donut-wrap {
            grid-template-columns: 1fr !important;
          }
        }      `}</style>
      <div className="hero-shell">
        <section className="hero hero-container">
          <img className="hero-image" src={HERO_FAMILY_IMAGE} alt="" aria-hidden="true" />
          <div className="hero-content" style={{ maxWidth: "660px", color: "#F8FAFC", transform: "none" }}>

            <div style={{
              color: "#C8A96E",
              fontSize: "18px",
              fontWeight: 800,
              letterSpacing: "0.4px",
              marginBottom: "18px"
            }}>
              Insurance Facts. Clearly Presented.
            </div>

            <h1 style={{
              fontSize: "clamp(34px, 4vw, 56px)",
              lineHeight: 1.16,
              margin: "0 0 20px",
              color: "#F8FAFC",
              fontWeight: 900
            }}>
              เพราะการตัดสินใจทางการเงินที่ดี<br />
              เริ่มต้นจากการเข้าใจข้อมูลอย่างถูกต้อง
            </h1>
          </div>
        </section>
      </div>


      <main className="layout prakan-responsive-shell page-background">
        <section className="panel prakan-presentation-panel">
          <div className="tabs">
            <button className={mode === "analyze" ? "active" : ""} onClick={() => setMode("analyze")}>
              <FileText size={16} /> 📊 กราฟ
            </button>
            <button className={mode === "compare" ? "active" : ""} onClick={() => setMode("compare")}>
              <Scale size={16} /> วิเคราะห์เอกสาร
            </button>
          </div>

          {mode === "analyze" && (
            <BenefitDonutChart
              totalPremium={calc.totalPremium}
              totalCashback={calc.totalCashback}
              maturity={maturity}
              projectedDividendTotal={projectedDividendTotal}
              netDifference={netDifference}
              guaranteedIRR={calc.guaranteedIRR}
              projectedIRR={calc.projectedIRR}
              setDepositReviewSummary={setDepositReviewSummary}
            />
          )}

          {mode === "compare" && (
            <div style={{marginTop: "14px"}}>
              <div style={{
                padding: "18px",
                borderRadius: "18px",
                border: "1px solid rgba(200,169,110,0.28)",
                background: "rgba(2,6,23,0.62)",
                textAlign: "center"
              }}>
                <FileText size={34} style={{color: "#C8A96E", marginBottom: "10px"}} />
                <h2 style={{margin: "0 0 8px", color: "#F8FAFC"}}>ยังไม่เปิดให้บริการ</h2>
                <p style={{margin: 0, color: "rgba(255,255,255,0.72)", lineHeight: 1.7}}>
                  กำลังพัฒนา
                </p>
              </div>

              <div style={{display: "grid", gap: "12px", marginTop: "14px"}}>
                <DisabledFeatureCard title="อัปโหลดใบเสนอขาย" detail="รองรับ PDF / รูปภาพ เพื่อสรุปข้อมูลแบบประกัน" />
                <DisabledFeatureCard title="เปรียบเทียบ 2 แบบ" detail="อัปโหลดเอกสาร 2 ชุด แล้วสรุปจุดต่างของเบี้ย เงินคืน ความคุ้มครอง และ IRR" />
                <DisabledFeatureCard title="ดึง IRR จากเอกสาร" detail="แยก IRR รับประกัน และ IRR รวมเงินปันผลที่ไม่รับประกัน" />
              </div>
            </div>
          )}
        </section>

        <section className="panel prakan-calculator-panel">
          <h2>เครื่องคำนวณและกรอกข้อมูล</h2>
          <p className="muted">กรอกข้อมูลจากใบเสนอขายประกัน แล้วระบบจะคำนวณ IRR และสร้างผลวิเคราะห์อัตโนมัติ</p>

          <div className="prakan-auto-update-note">
            💡 ผลลัพธ์ IRR และสรุปผลจะอัปเดตอัตโนมัติเมื่อมีการเปลี่ยนข้อมูล ไม่ต้องกดปุ่มคำนวณ
          </div>


          <div className="form-grid">
            <Input label="เบี้ยประกันปีละ" value={premium} setValue={setPremium} />
            <Input label="ชำระเบี้ยกี่ปี" value={payYears} setValue={setPayYears} />
            <Input label="ครบสัญญาปีที่" value={totalYears} setValue={setTotalYears} />
            <Input label="ทุนประกัน (บาท)" value={sumAssured} setValue={setSumAssured} placeholder="เช่น 1000000" />
            <div style={{
              gridColumn: "1 / -1",
              marginTop: "4px",
              padding: "16px",
              borderRadius: "18px",
              border: "1px solid rgba(200,169,110,0.36)",
              background: "rgba(8,18,36,0.58)"
            }}>
              
          <div style={{
            gridColumn: "1 / -1",
            marginTop: "8px",
            padding: "12px 14px",
            borderRadius: "14px",
            border: "1px solid rgba(200,169,110,0.28)",
            background: "rgba(200,169,110,0.10)",
            color: "rgba(255,255,255,0.78)",
            fontSize: "13px",
            lineHeight: 1.6
          }}>
            เริ่มต้นทุกช่องเป็นค่าว่าง เพื่อป้องกันตัวเลขตัวอย่างค้างอยู่ในผลคำนวณ กรุณากรอกเฉพาะข้อมูลที่มีในใบเสนอขาย
          </div>

<div style={{color: "#C8A96E", fontWeight: 900, marginBottom: "10px"}}>
                เงินคืนตามกรมธรรม์
              </div>

              <div style={{display: "grid", gridTemplateColumns: "1fr", gap: "8px"}}>
                {[
                  { key: "none", label: "ไม่มีเงินคืน" },
                  { key: "fixed", label: "เงินคืนคงที่ทุกปี" },
                  { key: "range", label: "เงินคืนเป็นช่วงปี" },
                  { key: "special", label: "คืนเฉพาะบางปี" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCashbackMode(item.key)}
                    style={{
                      padding: "11px 12px",
                      borderRadius: "14px",
                      border: cashbackMode === item.key ? "1px solid #C8A96E" : "1px solid rgba(255,255,255,0.16)",
                      background: cashbackMode === item.key ? "#C8A96E" : "rgba(2,6,23,0.45)",
                      color: cashbackMode === item.key ? "#07111f" : "#E5E7EB",
                      fontWeight: 900,
                      cursor: "pointer"
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {cashbackMode === "none" && (
                <div style={{marginTop: "12px", color: "rgba(255,255,255,0.72)", lineHeight: 1.65, fontSize: "13px"}}>
                  ใช้กับแบบที่ไม่มีเงินคืนระหว่างสัญญา เช่น จ่ายสั้น คุ้มครองสั้น หรือรับเงินก้อนตอนครบสัญญาเท่านั้น
                </div>
              )}

              {cashbackMode === "fixed" && (
                <div style={{display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px", marginTop: "14px"}}>
                  <Input label="คืนกี่ % ของทุน" value={cashbackPercent} setValue={setCashbackPercent} step="0.1" placeholder="เช่น 5" />
                  <Input
                    label="รับเงินคืนงวดแรกปีที่"
                    value={cashbackStart}
                    setValue={setCashbackStart}
                    placeholder="เช่น 1"
                    min="1"
                  />
                  <Input
                    label="รับเงินคืนถึงปีที่"
                    value={cashbackEnd}
                    setValue={setCashbackEnd}
                    placeholder="เช่น 13"
                    min="1"
                  />
</div>
              )}

              {cashbackMode === "range" && (
                <div style={{marginTop: "14px"}}>
                  <div style={{color: "rgba(255,255,255,0.72)", fontSize: "13px", lineHeight: 1.65, marginBottom: "10px"}}>
                    ใช้กับแบบที่คืนเป็นช่วง เช่น ปี 1-6 คืน 5% / ปี 7-20 คืน 6%<br />หากมีส่วนลดหรือเงินคืนทันทีหลังซื้อ ไม่ต้องนำมากรอกในส่วนนี้
                  </div>

                  <div style={{display: "grid", gridTemplateColumns: "0.8fr 0.8fr 1.2fr 1fr 44px", gap: "8px", color: "rgba(255,255,255,0.72)", fontSize: "13px", fontWeight: 800, marginBottom: "8px"}}>
                    <div>เริ่มคืนปีที่</div>
                    <div>คืนถึงปีที่</div>
                    <div>รูปแบบ</div>
                    <div>ค่า</div>
                    <div></div>
                  </div>

                  {rangeCashbackRows.map((row, index) => (
                    <div key={index} style={{display: "grid", gridTemplateColumns: "0.8fr 0.8fr 1.2fr 1fr 44px", gap: "8px", marginBottom: "8px", alignItems: "center"}}>
                      <input
                        type="number"
                        value={row.start}
                        onChange={(e) => updateRangeCashbackRow(index, "start", e.target.value)}
                        placeholder="1"
                        min="1"
                        style={{width: "100%", padding: "10px", borderRadius: "12px"}}
                      />
                      <input
                        type="number"
                        value={row.end}
                        onChange={(e) => updateRangeCashbackRow(index, "end", e.target.value)}
                        placeholder="6"
                        style={{width: "100%", padding: "10px", borderRadius: "12px"}}
                      />
                      <select value={row.type} onChange={(e) => updateRangeCashbackRow(index, "type", e.target.value)} style={{width: "100%", padding: "10px", borderRadius: "12px"}}>
                        <option value="percent">% ของทุนประกัน</option>
                        <option value="amount">จำนวนเงิน (บาท/ปี)</option>
                      </select>
                      <input type="number" value={row.value} onChange={(e) => updateRangeCashbackRow(index, "value", e.target.value)} placeholder={row.type === "percent" ? "เช่น 5" : "เช่น 50000"} style={{width: "100%", padding: "10px", borderRadius: "12px"}} />
                      <button type="button" onClick={() => removeRangeCashbackRow(index)} style={{height: "42px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", color: "#FFFFFF", fontWeight: 900}}>×</button>
                    </div>
                  ))}

                  <button type="button" onClick={addRangeCashbackRow} style={{marginTop: "6px", padding: "10px 14px", borderRadius: "999px", border: "1px solid rgba(200,169,110,0.55)", background: "#C8A96E", color: "#07111f", fontWeight: 900}}>
                    + เพิ่มช่วงเงินคืน
                  </button>
                </div>
              )}

              {cashbackMode === "special" && (
                <div style={{marginTop: "14px"}}>
                  <div style={{color: "rgba(255,255,255,0.72)", fontSize: "13px", lineHeight: 1.65, marginBottom: "10px"}}>
                    ใช้กับแบบที่คืนเฉพาะบางปี เช่น ปีที่ 3 คืนก้อนเดียว หรือคืนทุก 2 ปี<br />หากมีส่วนลดหรือเงินคืนทันทีหลังซื้อ ไม่ต้องนำมากรอกในส่วนนี้
                  </div>

                  <div style={{display: "grid", gridTemplateColumns: "0.8fr 1.2fr 1fr 44px", gap: "8px", color: "rgba(255,255,255,0.72)", fontSize: "13px", fontWeight: 800, marginBottom: "8px"}}>
                    <div>คืนปีที่</div>
                    <div>รูปแบบ</div>
                    <div>ค่า</div>
                    <div></div>
                  </div>

                  {specialCashbackRows.map((row, index) => (
                    <div key={index} style={{display: "grid", gridTemplateColumns: "0.8fr 1.2fr 1fr 44px", gap: "8px", marginBottom: "8px", alignItems: "center"}}>
                      <input
                        type="number"
                        value={row.year}
                        onChange={(e) => updateSpecialCashbackRow(index, "year", e.target.value)}
                        placeholder="เช่น 3"
                        min="1"
                        style={{width: "100%", padding: "10px", borderRadius: "12px"}}
                      />
                      <select value={row.type} onChange={(e) => updateSpecialCashbackRow(index, "type", e.target.value)} style={{width: "100%", padding: "10px", borderRadius: "12px"}}>
                        <option value="amount">จำนวนเงิน (บาท)</option>
                        <option value="percent">% ของทุนประกัน</option>
                      </select>
                      <input type="number" value={row.value} onChange={(e) => updateSpecialCashbackRow(index, "value", e.target.value)} placeholder={row.type === "percent" ? "เช่น 5" : "เช่น 100000"} style={{width: "100%", padding: "10px", borderRadius: "12px"}} />
                      <button type="button" onClick={() => removeSpecialCashbackRow(index)} style={{height: "42px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", color: "#FFFFFF", fontWeight: 900}}>×</button>
                    </div>
                  ))}

                  <button type="button" onClick={addSpecialCashbackRow} style={{marginTop: "6px", padding: "10px 14px", borderRadius: "999px", border: "1px solid rgba(200,169,110,0.55)", background: "#C8A96E", color: "#07111f", fontWeight: 900}}>
                    + เพิ่มคืนปีที่
                  </button>
                </div>
              )}
            </div>
            <Input label="เงินครบสัญญา" value={maturity} setValue={setMaturity} placeholder="เช่น 300000" />
                        <div style={{
              gridColumn: "1 / -1",
              marginTop: "4px",
              padding: "16px",
              borderRadius: "18px",
              border: "1px solid rgba(200,169,110,0.36)",
              background: "rgba(8,18,36,0.58)"
            }}>
              <div style={{color: "#C8A96E", fontWeight: 900, marginBottom: "10px"}}>
                เงินปันผลคาดการณ์ / โบนัสพิเศษ
              </div>

              <div style={{display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px"}}>
                <button type="button" onClick={() => setDividendMode("single")} style={{
                  padding: "11px 12px",
                  borderRadius: "14px",
                  border: dividendMode === "single" ? "1px solid #C8A96E" : "1px solid rgba(255,255,255,0.16)",
                  background: dividendMode === "single" ? "#C8A96E" : "rgba(2,6,23,0.45)",
                  color: dividendMode === "single" ? "#07111f" : "#E5E7EB",
                  fontWeight: 900,
                  cursor: "pointer"
                }}>
                  รับครั้งเดียวตอนครบสัญญา
                </button>

                <button type="button" onClick={() => setDividendMode("annual")} style={{
                  padding: "11px 12px",
                  borderRadius: "14px",
                  border: dividendMode === "annual" ? "1px solid #C8A96E" : "1px solid rgba(255,255,255,0.16)",
                  background: dividendMode === "annual" ? "#C8A96E" : "rgba(2,6,23,0.45)",
                  color: dividendMode === "annual" ? "#07111f" : "#E5E7EB",
                  fontWeight: 900,
                  cursor: "pointer"
                }}>
                  รับรายปี (ขั้นสูง)
                </button>
              </div>

              {dividendMode === "single" && (
                <div style={{display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginTop: "14px"}}>
                  <Input label="เงินปันผลคาดการณ์เมื่อครบสัญญา" value={dividend} setValue={setDividend} placeholder="เช่น 503050" />
                  <Input label="โบนัสพิเศษเมื่อครบสัญญา (ถ้ามี)" value={maturityBonus} setValue={setMaturityBonus} placeholder="ถ้าไม่มีให้เว้นไว้" />
                </div>
              )}

              {dividendMode === "annual" && (
                <div style={{marginTop: "14px"}}>
                  <div style={{color: "rgba(255,255,255,0.72)", fontSize: "13px", lineHeight: 1.65, marginBottom: "10px"}}>
                    ใช้กรณีบริษัทแสดงเงินปันผลคาดการณ์แยกเป็นรายปี ให้กรอกตามตัวเลขในใบเสนอขาย
                  </div>

                  <div style={{display: "grid", gridTemplateColumns: "0.8fr 1.2fr 44px", gap: "8px", color: "rgba(255,255,255,0.72)", fontSize: "13px", fontWeight: 800, marginBottom: "8px"}}>
                    <div>ปีที่รับ</div>
                    <div>เงินปันผล</div>
                    <div></div>
                  </div>

                  {annualDividendRows.map((row, index) => (
                    <div key={index} style={{display: "grid", gridTemplateColumns: "0.8fr 1.2fr 44px", gap: "8px", marginBottom: "8px", alignItems: "center"}}>
                      <input type="number" value={row.year} onChange={(e) => updateAnnualDividendRow(index, "year", e.target.value)} placeholder="เช่น 14" style={{width: "100%", padding: "10px", borderRadius: "12px"}} />
                      <input type="number" value={row.amount} onChange={(e) => updateAnnualDividendRow(index, "amount", e.target.value)} placeholder="เช่น 503050" style={{width: "100%", padding: "10px", borderRadius: "12px"}} />
                      <button type="button" onClick={() => removeAnnualDividendRow(index)} style={{height: "42px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", color: "#FFFFFF", fontWeight: 900}}>×</button>
                    </div>
                  ))}

                  <button type="button" onClick={addAnnualDividendRow} style={{marginTop: "6px", padding: "10px 14px", borderRadius: "999px", border: "1px solid rgba(200,169,110,0.55)", background: "#C8A96E", color: "#07111f", fontWeight: 900}}>
                    + เพิ่มรายการปันผล
                  </button>

                  <div style={{marginTop: "14px"}}>
                    <Input label="โบนัสพิเศษเมื่อครบสัญญา (ถ้ามี)" value={maturityBonus} setValue={setMaturityBonus} placeholder="ถ้าไม่มีให้เว้นไว้" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <label style={{gridColumn: "1 / -1", display: "block", marginTop: "1rem"}}>
            <span>หมายเหตุเพิ่มเติม (optional)</span>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ประกันกับพ่อแม่, มีสิทธิ์อื่น ๆ, ฯลฯ"
              style={{width: "100%", minHeight: "80px", padding: "0.5rem", marginTop: "0.5rem"}}
            />
          </label>
            <div style={{
              marginTop: "12px",
              padding: "12px 14px",
              borderRadius: "14px",
              border: "1px solid rgba(200,169,110,0.30)",
              background: "rgba(200,169,110,0.10)",
              color: "rgba(255,255,255,0.78)",
              fontSize: "13px",
              lineHeight: 1.65
            }}>
              IRR คือผลตอบแทนเฉลี่ยต่อปีจากกระแสเงินสดของแผนนี้ เช่น เบี้ยที่จ่าย เงินคืน และเงินครบสัญญา ไม่ใช่เปอร์เซ็นต์เงินคืนของทุนประกัน
            </div>


          <div className="cashflow">
            <h3>สรุปเงิน</h3>
            <div>รวมเบี้ยที่จ่าย: <b>{money(calc.totalPremium)}</b> บาท</div>
            <div>รวมเงินคืนระหว่างทาง: <b>{money(calc.totalCashback)}</b> บาท</div>
            <div>เงินครบสัญญา: <b>{money(maturity)}</b> บาท</div>
            <div>เงินปันผล/โบนัสคาดการณ์: <b>{money(projectedDividendTotal)}</b> บาท</div>
            <div style={{marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(200,169,110,0.22)", color: netDifference >= 0 ? "#86EFAC" : "#FCA5A5", fontWeight: 900}}>
              กำไร/ส่วนต่างสุทธิ: <b>{money(netDifference)}</b> บาท
            </div>
            <div style={{marginTop: "4px", color: "rgba(255,255,255,0.58)", fontSize: "12px", lineHeight: 1.55}}>
              คำนวณจาก (เงินคืนระหว่างทาง + เงินครบสัญญา + เงินปันผลคาดการณ์) - รวมเบี้ยที่จ่าย
            </div>
            <div style={{marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(200,169,110,0.22)", display: "grid", gap: "6px"}}>
              <div>IRR รับประกัน: <b>{Number.isFinite(calc.guaranteedIRR) ? calc.guaranteedIRR.toFixed(2) : "-"}%</b> ต่อปี</div>
              <div>IRR รวมคาดการณ์: <b>{Number.isFinite(calc.projectedIRR) ? calc.projectedIRR.toFixed(2) : "-"}%</b> ต่อปี</div>
            </div>

            {hasCashback && (
              <div style={{marginTop: "10px", color: "#C8A96E", fontWeight: 800, lineHeight: 1.65}}>
                มีเงินคืนระหว่างทางตามรูปแบบที่เลือกไว้
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowReviewMode(true)}
              style={{
                marginTop: "14px",
                width: "100%",
                padding: "12px 16px",
                borderRadius: "14px",
                border: "1px solid rgba(200,169,110,0.55)",
                background: "linear-gradient(135deg, #DDBB68 0%, #C8A96E 52%, #B8872D 100%)",
                color: "#07111f",
                fontWeight: 900,
                cursor: "pointer"
              }}
            >
              ดูโหมดรีวิว
            </button>
          </div>
        </section>
<section id="contact" className="panel" style={{
          gridColumn: "1 / -1",
          textAlign: "center"
        }}>
          <h2 style={{color: "#C8A96E"}}>ติดต่อ PrakanClear</h2>
          <a href="mailto:fondzdnc@gmail.com" style={{
            color: "#FFFFFF",
            fontWeight: 900,
            fontSize: "1.08rem",
            textDecoration: "none"
          }}>fondzdnc@gmail.com</a>
          <p className="muted" style={{marginTop: "10px"}}>
            หากพบข้อมูลผิดพลาด หรือต้องการเสนอแนะเพิ่มเติม สามารถติดต่อได้ทางอีเมลนี้
          </p>
        </section>

      </main>

      <footer style={{fontSize: "14px", lineHeight: 1.7, maxWidth: "980px", margin: "26px auto"}}>
        {FULL_DISCLAIMER}
      </footer>

      {showReviewMode && (
        <ReviewMode
          insurancePrincipal={calc.totalPremium}
          insuranceGain={netDifference}
          depositPrincipal={depositReviewSummary.totalDeposits}
          depositGain={depositReviewSummary.totalInterest}
          onClose={() => setShowReviewMode(false)}
        />
      )}
    </div>
  );
}


function ReviewMode({ insurancePrincipal, insuranceGain, depositPrincipal, depositGain, onClose }) {
  const [activeTab, setActiveTab] = useState("insurance");
  const insurance = {
    principal: Number(insurancePrincipal || 0),
    gain: Number(insuranceGain || 0)
  };
  const deposit = {
    principal: Number(depositPrincipal || 0),
    gain: Number(depositGain || 0)
  };
  const comparisonGap = Math.abs(insurance.gain - deposit.gain);

  const tabs = [
    { key: "insurance", label: "ประกัน" },
    { key: "deposit", label: "เงินฝาก" },
    { key: "summary", label: "สรุป" },
  ];

  return (
    <div className="review-mode-overlay" role="dialog" aria-modal="true">
      <style>{`
        .review-mode-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow-y: auto;
          overflow-x: hidden;
          background:
            radial-gradient(circle at top left, rgba(200,169,110,0.16), transparent 28%),
            radial-gradient(circle at bottom right, rgba(74,222,128,0.08), transparent 32%),
            #020617;
          color: #E5E7EB;
          padding: 22px;
          box-sizing: border-box;
        }
        .review-mode-shell {
          position: relative;
          width: min(1180px, 100%);
          min-height: calc(100vh - 44px);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .review-watermark {
          position: fixed;
          top: 48%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-14deg);
          text-align: center;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: rgba(200,169,110,0.075);
          pointer-events: none;
          z-index: 0;
          white-space: nowrap;
          line-height: 1.25;
        }
        .review-watermark strong {
          display: block;
          font-size: clamp(46px, 10vw, 132px);
        }
        .review-watermark span {
          display: block;
          font-size: clamp(15px, 2.2vw, 30px);
        }
        .review-topbar,
        .review-tabs,
        .review-panel,
        .review-footnote {
          position: relative;
          z-index: 1;
        }
        .review-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px 18px;
          border: 1px solid rgba(200,169,110,0.24);
          border-radius: 18px;
          background: rgba(15,23,42,0.78);
          box-shadow: 0 18px 54px rgba(0,0,0,0.34);
        }
        .review-tabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .review-tabs button,
        .review-close {
          border: 1px solid rgba(200,169,110,0.32);
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 900;
          cursor: pointer;
          box-sizing: border-box;
        }
        .review-tabs button {
          background: rgba(15,23,42,0.88);
          color: #E5E7EB;
        }
        .review-tabs button.active {
          background: #C8A96E;
          color: #07111f;
        }
        .review-close {
          background: rgba(2,6,23,0.72);
          color: #F8FAFC;
          white-space: nowrap;
        }
        .review-panel {
          flex: 1;
          padding: clamp(18px, 3vw, 30px);
          border: 1px solid rgba(200,169,110,0.24);
          border-radius: 22px;
          background: rgba(15,23,42,0.86);
          box-shadow: 0 22px 70px rgba(0,0,0,0.36);
          box-sizing: border-box;
        }
        .review-grid {
          display: grid;
          grid-template-columns: minmax(280px, 0.95fr) minmax(280px, 1.05fr);
          gap: 18px;
          align-items: stretch;
        }
        .review-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(280px, 1fr));
          gap: 18px;
        }
        .review-info-box {
          padding: 16px;
          border-radius: 18px;
          border: 1px solid rgba(200,169,110,0.22);
          background: rgba(2,6,23,0.46);
        }
        .review-info-box h3 {
          margin: 0 0 10px;
          color: #C8A96E;
        }
        .review-info-box ul {
          margin: 0;
          padding-left: 0;
          list-style: none;
          display: grid;
          gap: 9px;
          line-height: 1.55;
        }
        .review-footnote {
          color: rgba(255,255,255,0.62);
          font-size: 12px;
          line-height: 1.6;
          padding: 0 4px 4px;
        }
        @media (max-width: 820px) {
          .review-mode-overlay {
            padding: 12px;
          }
          .review-mode-shell {
            min-height: calc(100vh - 24px);
          }
          .review-topbar {
            align-items: stretch;
            flex-direction: column;
          }
          .review-close {
            width: 100%;
          }
          .review-grid,
          .review-summary-grid {
            grid-template-columns: 1fr;
          }
          .review-tabs {
            gap: 8px;
          }
          .review-tabs button {
            padding: 11px 8px;
          }
        }
      `}</style>

      <div className="review-watermark">
        <strong>PRAKAN CLEAR</strong>
        <span>ตัวอย่างการคำนวณเท่านั้น</span>
        <span>ไม่ใช่เอกสารเสนอขาย</span>
      </div>

      <div className="review-mode-shell">
        <div className="review-topbar">
          <div>
            <div style={{fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 900, color: "#F8FAFC"}}>Prakan Clear</div>
            <div style={{marginTop: "4px", color: "#C8A96E", fontWeight: 800}}>โหมดรีวิวตัวอย่างการคำนวณ</div>
            <div style={{marginTop: "6px", color: "rgba(255,255,255,0.64)", fontSize: "13px", lineHeight: 1.5}}>
              ใช้สำหรับแสดงภาพรวมจากข้อมูลที่กรอก ไม่ใช่เอกสารเสนอขายอย่างเป็นทางการ
            </div>
          </div>
          <button type="button" className="review-close" onClick={onClose}>กลับไปแก้ไขข้อมูล</button>
        </div>

        <div className="review-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? "active" : ""}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <main className="review-panel">
          {activeTab === "insurance" && (
            <ReviewSinglePage
              title="รีวิวประกัน"
              donutTitle="ประกัน"
              principalLabel="เบี้ยรวม"
              principalValue={insurance.principal}
              gainLabel="ส่วนต่างสุทธิ"
              gainValue={insurance.gain}
              pros={["มีความมั่นคงสูง", "ความเสี่ยงต่ำ", "ผลตอบแทนไม่เสียภาษี", "มีความคุ้มครอง", "ส่งต่อมรดกแบบปลอดภาษี"]}
              cons={["สภาพคล่องต่ำ"]}
            />
          )}

          {activeTab === "deposit" && (
            <ReviewSinglePage
              title="รีวิวเงินฝาก"
              donutTitle="เงินฝาก"
              principalLabel="เงินต้นรวม"
              principalValue={deposit.principal}
              gainLabel="ดอกเบี้ยสุทธิรวม"
              gainValue={deposit.gain}
              pros={["สภาพคล่องสูง", "มีความยืดหยุ่นสูง"]}
              cons={["อัตราดอกเบี้ยเปลี่ยนตามประกาศได้ตลอด", "เงินดอกเบี้ยต้องเสียภาษี"]}
            />
          )}

          {activeTab === "summary" && (
            <div>
              <h2 style={{margin: "0 0 18px", color: "#F8FAFC", fontSize: "clamp(26px, 4vw, 42px)"}}>สรุปเปรียบเทียบ</h2>
              <div className="review-summary-grid">
                <ReviewDonut
                  title="ประกัน"
                  principalLabel="เงินต้นรวม"
                  principalValue={insurance.principal}
                  gainLabel="ส่วนต่าง"
                  gainValue={insurance.gain}
                />
                <ReviewDonut
                  title="เงินฝาก"
                  principalLabel="เงินต้นรวม"
                  principalValue={deposit.principal}
                  gainLabel="ส่วนต่าง"
                  gainValue={deposit.gain}
                />
              </div>
              <div style={{
                marginTop: "18px",
                padding: "18px",
                borderRadius: "18px",
                border: "1px solid rgba(200,169,110,0.28)",
                background: "rgba(200,169,110,0.10)",
                color: "#F8FAFC",
                fontSize: "clamp(18px, 2.4vw, 26px)",
                fontWeight: 900,
                textAlign: "center"
              }}>
                ส่วนต่างระหว่างประกันและเงินฝาก {money(comparisonGap)} บาท
              </div>
            </div>
          )}
        </main>

        <div className="review-footnote">
          * ข้อความบางส่วนเป็นการสรุปโดยย่อ ควรพิจารณาตามหลักเกณฑ์ เงื่อนไขกรมธรรม์ และเงื่อนไขทางภาษีที่เกี่ยวข้อง
        </div>
      </div>
    </div>
  );
}


function ReviewSinglePage({ title, donutTitle, principalLabel, principalValue, gainLabel, gainValue, pros, cons }) {
  return (
    <div>
      <h2 style={{margin: "0 0 18px", color: "#F8FAFC", fontSize: "clamp(26px, 4vw, 42px)"}}>{title}</h2>
      <div className="review-grid">
        <ReviewDonut
          title={donutTitle}
          principalLabel={principalLabel}
          principalValue={principalValue}
          gainLabel={gainLabel}
          gainValue={gainValue}
        />
        <div style={{display: "grid", gap: "14px"}}>
          <ReviewProsCons title="จุดเด่น" items={pros} marker="✓" color="#4ADE80" />
          <ReviewProsCons title="ข้อจำกัด" items={cons} marker="!" color="#FBBF24" />
        </div>
      </div>
    </div>
  );
}


function ReviewDonut({ title, principalLabel, principalValue, gainLabel, gainValue }) {
  const principal = Math.max(Number(principalValue || 0), 0);
  const gainRaw = Number(gainValue || 0);
  const gainForChart = Math.abs(gainRaw);
  const total = principal + gainForChart;
  const principalPercent = total > 0 ? (principal / total) * 100 : 0;
  const donutBackground = total > 0
    ? `conic-gradient(#60A5FA 0% ${principalPercent}%, #4ADE80 ${principalPercent}% 100%)`
    : "conic-gradient(rgba(148,163,184,0.38) 0% 100%)";
  const gainColor = gainRaw >= 0 ? "#4ADE80" : "#FCA5A5";

  return (
    <section style={{
      padding: "18px",
      borderRadius: "20px",
      border: "1px solid rgba(200,169,110,0.24)",
      background: "rgba(2,6,23,0.48)",
      minWidth: 0
    }}>
      <h3 style={{margin: "0 0 16px", color: "#C8A96E", fontSize: "1.15rem"}}>{title}</h3>
      <div style={{display: "grid", placeItems: "center"}}>
        <div style={{
          width: "min(300px, 72vw)",
          aspectRatio: "1 / 1",
          borderRadius: "50%",
          background: donutBackground,
          boxShadow: "0 18px 48px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(255,255,255,0.08)",
          position: "relative"
        }}>
          <div style={{
            position: "absolute",
            inset: "27%",
            borderRadius: "50%",
            background: "#020617",
            border: "1px solid rgba(255,255,255,0.10)",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            padding: "12px"
          }}>
            <div style={{fontSize: "12px", color: "rgba(255,255,255,0.62)"}}>{gainLabel}</div>
            <div style={{fontSize: "clamp(17px, 3vw, 25px)", color: gainColor, fontWeight: 900, lineHeight: 1.12}}>
              {money(gainRaw)}
            </div>
            <div style={{fontSize: "11px", color: "rgba(255,255,255,0.52)"}}>บาท</div>
          </div>
        </div>
      </div>

      <div style={{display: "grid", gap: "10px", marginTop: "18px"}}>
        <ReviewMetricRow color="#60A5FA" label={principalLabel} value={principal} />
        <ReviewMetricRow color={gainColor} label={gainLabel} value={gainRaw} />
      </div>
    </section>
  );
}


function ReviewMetricRow({ color, label, value }) {
  return (
    <div style={{display: "grid", gridTemplateColumns: "16px 1fr auto", gap: "10px", alignItems: "center", minWidth: 0}}>
      <span style={{width: "13px", height: "13px", borderRadius: "50%", background: color, boxShadow: `0 0 0 4px ${color}22`}} />
      <span style={{color: "rgba(255,255,255,0.72)", minWidth: 0}}>{label}</span>
      <strong style={{color: "#F8FAFC", textAlign: "right", whiteSpace: "nowrap"}}>{money(value)} บาท</strong>
    </div>
  );
}


function ReviewProsCons({ title, items, marker, color }) {
  return (
    <section className="review-info-box">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item} style={{display: "flex", gap: "10px", color: "#E5E7EB"}}>
            <span style={{color, fontWeight: 900}}>{marker}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}


function BenefitDonutChart({ totalPremium, totalCashback, maturity, projectedDividendTotal, netDifference, guaranteedIRR, projectedIRR, setDepositReviewSummary = () => {} }) {
  const displayItems = [
    { key: "paid", label: "เบี้ยที่จ่าย", detail: "เงินออก", value: Number(totalPremium || 0), color: "#EF4444" },
    { key: "cashback", label: "เงินคืนระหว่างทาง", detail: "เงินเข้า", value: Number(totalCashback || 0), color: "#4ADE80" },
    { key: "maturity", label: "เงินครบสัญญา", detail: "เงินเข้า", value: Number(maturity || 0), color: "#22C55E" },
    { key: "dividend", label: "เงินปันผล/โบนัสคาดการณ์", detail: "ไม่รับประกัน", value: Number(projectedDividendTotal || 0), color: "#60A5FA" },
    { key: "net", label: "กำไร/ส่วนต่างสุทธิ", detail: "ผลประโยชน์รวม - เบี้ยที่จ่าย", value: Math.abs(Number(netDifference || 0)), rawValue: Number(netDifference || 0), color: "#FBBF24" },
  ].filter((item) => Number(item.value) > 0);

  const total = displayItems.reduce((sum, item) => sum + item.value, 0);

  let cursor = 0;
  const gradientParts = displayItems.map((item) => {
    const start = cursor;
    const pct = total > 0 ? (item.value / total) * 100 : 0;
    cursor += pct;
    return `${item.color} ${start}% ${cursor}%`;
  });

  const donutBackground = total > 0
    ? `conic-gradient(${gradientParts.join(", ")})`
    : "conic-gradient(rgba(255,255,255,0.12) 0% 100%)";

  const netColor = Number(netDifference || 0) >= 0 ? "#FBBF24" : "#FCA5A5";
  const netReturnPercent = Number(totalPremium || 0) > 0
    ? (Number(netDifference || 0) / Number(totalPremium || 0)) * 100
    : null;

  return (
    <div style={{
      marginTop: "14px",
      padding: "18px",
      borderRadius: "20px",
      background: "rgba(2,6,23,0.58)",
      border: "1px solid rgba(200,169,110,0.24)",
      color: "#E5E7EB"
    }}>
      <h2 style={{margin: "0 0 4px", color: "#F8FAFC"}}>สรุปผลประโยชน์</h2>
      <p style={{margin: "0 0 16px", color: "rgba(255,255,255,0.68)", fontSize: "13px", lineHeight: 1.65}}>
        ภาพรวมจากข้อมูลที่กรอก แสดงสัดส่วนเบี้ยที่จ่าย เงินคืน เงินครบสัญญา และส่วนต่างสุทธิ
      </p>

      <div style={{display: "flex", flexDirection: "column", gap: "18px", alignItems: "center"}} className="prakan-donut-wrap">
        <div style={{display: "grid", placeItems: "center"}}>
          <div style={{
            width: "min(280px, 72vw)",
            aspectRatio: "1 / 1",
            borderRadius: "50%",
            background: donutBackground,
            boxShadow: "0 18px 45px rgba(0,0,0,0.36), inset 0 0 0 1px rgba(255,255,255,0.08)",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              inset: "26%",
              borderRadius: "50%",
              background: "#020617",
              border: "1px solid rgba(255,255,255,0.10)",
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              padding: "12px"
            }}>
              <div style={{fontSize: "12px", color: "rgba(255,255,255,0.62)", marginBottom: "4px"}}>ส่วนต่างสุทธิ</div>
              <div style={{fontSize: "clamp(18px, 4vw, 26px)", color: netColor, fontWeight: 900, lineHeight: 1.1}}>
                {money(Number(netDifference || 0))}
              </div>
              <div style={{fontSize: "11px", color: "rgba(255,255,255,0.55)", marginTop: "4px"}}>บาท</div>
            </div>
          </div>
        </div>

        <div style={{display: "grid", gap: "10px", width: "100%"}}>
          {displayItems.map((item) => {
            const shownValue = item.key === "net" ? Number(item.rawValue || 0) : Number(item.value || 0);
            return (
              <div key={item.key} style={{
                display: "grid",
                gridTemplateColumns: "18px 1fr auto",
                gap: "10px",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid rgba(255,255,255,0.08)"
              }}>
                <span style={{width: "14px", height: "14px", borderRadius: "50%", background: item.color, display: "inline-block", boxShadow: `0 0 0 4px ${item.color}22`}} />
                <div>
                  <div style={{fontWeight: 800, color: "#F8FAFC", lineHeight: 1.25}}>{item.label}</div>
                  <div style={{fontSize: "12px", color: "rgba(255,255,255,0.55)", marginTop: "2px"}}>{item.detail}</div>
                </div>
                <div style={{textAlign: "right"}}>
                  <div style={{fontWeight: 900, color: item.key === "net" ? netColor : item.color, fontSize: "18px", lineHeight: 1.15}}>
                    {money(shownValue)} บาท
                  </div>
                  {item.key === "net" && (
                    <div style={{fontSize: "12px", color: "rgba(255,255,255,0.62)", marginTop: "2px"}}>
                      {netReturnPercent === null ? "-" : `คิดเป็น ${netReturnPercent.toFixed(2)}% ของเบี้ยที่จ่าย`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {false && (
          <div style={{
            marginTop: "4px",
            padding: "12px",
            borderRadius: "14px",
            border: "1px solid rgba(200,169,110,0.26)",
            background: "rgba(200,169,110,0.09)",
            display: "grid",
            gap: "7px"
          }}>
            <div style={{display: "flex", justifyContent: "space-between", gap: "12px", color: "#E5E7EB"}}>
              <span>IRR รับประกัน</span>
              <b>{Number.isFinite(guaranteedIRR) ? guaranteedIRR.toFixed(2) : "-"}% ต่อปี</b>
            </div>
            <div style={{display: "flex", justifyContent: "space-between", gap: "12px", color: "#E5E7EB"}}>
              <span>IRR รวมคาดการณ์</span>
              <b>{Number.isFinite(projectedIRR) ? projectedIRR.toFixed(2) : "-"}% ต่อปี</b>
            </div>
          </div>
          )}
        </div>
      </div>

      <div style={{
        marginTop: "14px",
        padding: "11px 12px",
        borderRadius: "14px",
        border: "1px solid rgba(200,169,110,0.22)",
        color: "rgba(255,255,255,0.68)",
        fontSize: "12px",
        lineHeight: 1.6
      }}>
        หมายเหตุ: เปอร์เซ็นต์ในกราฟเป็นสัดส่วนเพื่อการนำเสนอจากตัวเลขที่กรอก ไม่ใช่ IRR และไม่ใช่มูลค่าเวนคืนกรมธรรม์
      </div>

      <DepositInterestCalculator onSummaryChange={setDepositReviewSummary} />
    </div>
  );
}


function LegacyDepositInterestCalculator() {
  const [initialPrincipal, setInitialPrincipal] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [taxRate, setTaxRate] = useState(15);
  const [years, setYears] = useState("");
  const [addEveryYear, setAddEveryYear] = useState(false);
  const [addYears, setAddYears] = useState("");
  const [annualAdd, setAnnualAdd] = useState("");

  const parsePositiveNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  };

  const depositCalc = useMemo(() => {
    const principal = parsePositiveNumber(initialPrincipal);
    const rate = parsePositiveNumber(annualRate);
    const tax = Math.min(Math.max(Number(taxRate) || 0, 0), 100);
    const totalYears = Math.floor(parsePositiveNumber(years));
    const yearlyAdd = addEveryYear ? parsePositiveNumber(annualAdd) : 0;
    const yearsToAdd = addEveryYear ? Math.floor(parsePositiveNumber(addYears)) : 0;
    const afterTaxRate = rate * (1 - tax / 100);

    let balance = principal;
    let totalDeposits = principal;
    let totalInterest = 0;
    const rows = [];

    for (let year = 1; year <= totalYears; year++) {
      const startBalance = balance;
      const addAmount = addEveryYear && year >= 2 && year <= yearsToAdd + 1 ? yearlyAdd : 0;
      const base = startBalance + addAmount;
      const interest = base * (afterTaxRate / 100);
      const endBalance = base + interest;

      totalDeposits += addAmount;
      totalInterest += interest;
      balance = endBalance;

      rows.push({ year, startBalance, addAmount, interest, endBalance });
    }

    return {
      afterTaxRate,
      totalDeposits,
      totalInterest,
      endingBalance: balance,
      rows
    };
  }, [initialPrincipal, annualRate, taxRate, years, addEveryYear, addYears, annualAdd]);

  const fieldStyle = { display: "grid", gap: "6px" };
  const inputStyle = {
    width: "100%",
    border: "1px solid rgba(200,169,110,0.32)",
    borderRadius: "12px",
    padding: "10px 12px",
    background: "rgba(2,6,23,0.72)",
    color: "#F8FAFC"
  };

  return (
    <section style={{
      marginTop: "16px",
      padding: "16px",
      borderRadius: "18px",
      border: "1px solid rgba(200,169,110,0.24)",
      background: "rgba(2,6,23,0.46)",
      color: "#E5E7EB"
    }}>
      <h2 style={{margin: "0 0 6px", color: "#F8FAFC", fontSize: "1.2rem"}}>คำนวณดอกเบี้ยเงินฝากทั่วไป</h2>
      <p style={{margin: "0 0 14px", color: "rgba(255,255,255,0.68)", fontSize: "13px", lineHeight: 1.6}}>
        ใช้สำหรับอ้างอิงผลตอบแทนเงินฝากแบบง่าย โดยคำนวณจากดอกเบี้ยรายปีและภาษีหัก ณ ที่จ่าย
      </p>

      <div className="deposit-input-grid" style={{display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px"}}>
        <label style={fieldStyle}>
          <span>เงินต้นเริ่มต้น</span>
          <input type="number" min="0" placeholder="100000" value={initialPrincipal} onChange={(e) => setInitialPrincipal(e.target.value)} style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          <span>ดอกเบี้ยต่อปี (%)</span>
          <input type="number" min="0" step="0.01" placeholder="0.8" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          <span>ภาษีดอกเบี้ย (%)</span>
          <input type="number" min="0" max="100" step="0.01" placeholder="15" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          <span>ดอกเบี้ยหลังหักภาษี (%)</span>
          <input type="text" readOnly value={`${depositCalc.afterTaxRate.toFixed(2)}%`} style={{...inputStyle, color: "#C8A96E", fontWeight: 900}} />
        </label>
        <label style={fieldStyle}>
          <span>จำนวนปีที่ฝาก</span>
          <input type="number" min="0" placeholder="5" value={years} onChange={(e) => setYears(e.target.value)} style={inputStyle} />
        </label>
        <label style={{...fieldStyle, alignContent: "end"}}>
          <span style={{display: "flex", alignItems: "center", gap: "10px", minHeight: "42px", color: "#E5E7EB", fontWeight: 800}}>
            <input type="checkbox" checked={addEveryYear} onChange={(e) => setAddEveryYear(e.target.checked)} style={{width: "18px", height: "18px", accentColor: "#C8A96E"}} />
            ฝากเพิ่มทุกปี
          </span>
        </label>
      </div>

      {addEveryYear && (
        <div className="deposit-input-grid" style={{display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginTop: "10px"}}>
          <label style={fieldStyle}>
            <span>จำนวนปีที่ฝากเพิ่ม</span>
            <input type="number" min="0" placeholder="3" value={addYears} onChange={(e) => setAddYears(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldStyle}>
            <span>ฝากเพิ่มปีละ</span>
            <input type="number" min="0" placeholder="100000" value={annualAdd} onChange={(e) => setAnnualAdd(e.target.value)} style={inputStyle} />
          </label>
        </div>
      )}

      <div className="deposit-summary-grid" style={{display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginTop: "14px"}}>
        {[
          ["เงินฝากรวมทั้งหมด", money(depositCalc.totalDeposits), "#C8A96E"],
          ["ดอกเบี้ยรวมหลังหักภาษี", money(depositCalc.totalInterest), "#4ADE80"],
          ["ยอดเงินปลายทาง", money(depositCalc.endingBalance), "#4ADE80"],
          ["อัตราดอกเบี้ยหลังหักภาษี", `${depositCalc.afterTaxRate.toFixed(2)}%`, "#C8A96E"],
        ].map(([label, value, color]) => (
          <div key={label} style={{
            padding: "12px",
            borderRadius: "14px",
            border: "1px solid rgba(200,169,110,0.22)",
            background: "rgba(15,23,42,0.68)"
          }}>
            <div style={{fontSize: "12px", color: "rgba(255,255,255,0.62)", marginBottom: "5px"}}>{label}</div>
            <div style={{fontSize: "20px", fontWeight: 900, color}}>{value}</div>
          </div>
        ))}
      </div>

      <div className="deposit-table-wrap" style={{marginTop: "14px", overflowX: "auto"}}>
        <table className="deposit-table" style={{width: "100%", minWidth: "640px", borderCollapse: "collapse", fontSize: "13px"}}>
          <thead>
            <tr>
              {["ปีที่", "เงินต้นต้นปี", "ฝากเพิ่ม", "ดอกเบี้ยหลังหักภาษี", "ยอดปลายปี"].map((header) => (
                <th key={header} style={{textAlign: "right", padding: "10px 8px", color: "#C8A96E", borderBottom: "1px solid rgba(200,169,110,0.28)"}}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {depositCalc.rows.length === 0 ? (
              <tr>
                <td colSpan="5" style={{padding: "14px 8px", color: "rgba(255,255,255,0.58)", textAlign: "center"}}>
                  กรอกข้อมูลเพื่อดูรายละเอียดรายปี
                </td>
              </tr>
            ) : depositCalc.rows.map((row) => (
              <tr key={row.year}>
                <td style={{padding: "9px 8px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.08)"}}>{row.year}</td>
                <td style={{padding: "9px 8px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.08)"}}>{money(row.startBalance)}</td>
                <td style={{padding: "9px 8px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.08)", color: row.addAmount > 0 ? "#C8A96E" : "rgba(255,255,255,0.55)"}}>{money(row.addAmount)}</td>
                <td style={{padding: "9px 8px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#4ADE80"}}>{money(row.interest)}</td>
                <td style={{padding: "9px 8px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#F8FAFC", fontWeight: 800}}>{money(row.endBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: "12px",
        padding: "11px 12px",
        borderRadius: "14px",
        border: "1px solid rgba(200,169,110,0.20)",
        color: "rgba(255,255,255,0.66)",
        fontSize: "12px",
        lineHeight: 1.6
      }}>
        ตัวเลขนี้เป็นการคำนวณตัวอย่างแบบง่ายจากดอกเบี้ยรายปี ไม่ใช่ข้อเสนอเงินฝากจากธนาคารใดธนาคารหนึ่ง และอัตราดอกเบี้ยจริงอาจแตกต่างกันตามเงื่อนไขของแต่ละสถาบันการเงิน
      </div>
    </section>
  );
}


function DepositInterestCalculator({ onSummaryChange }) {
  const [initialPrincipal, setInitialPrincipal] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [taxRate, setTaxRate] = useState(15);
  const [years, setYears] = useState("");
  const [addEveryYear, setAddEveryYear] = useState(false);
  const [addYears, setAddYears] = useState("");
  const [annualAdd, setAnnualAdd] = useState("");

  const parsePositiveNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  };

  const depositCalc = useMemo(() => {
    const principal = parsePositiveNumber(initialPrincipal);
    const rate = parsePositiveNumber(annualRate);
    const tax = Math.min(Math.max(Number(taxRate) || 0, 0), 100);
    const totalYears = Math.floor(parsePositiveNumber(years));
    const yearlyAdd = addEveryYear ? parsePositiveNumber(annualAdd) : 0;
    const yearsToAdd = addEveryYear ? Math.floor(parsePositiveNumber(addYears)) : 0;
    const afterTaxRate = rate * (1 - tax / 100);

    let balance = principal;
    let totalDeposits = principal;
    let totalInterest = 0;
    const rows = [];

    for (let year = 1; year <= totalYears; year++) {
      const startBalance = balance;
      const addAmount = addEveryYear && year >= 2 && year <= yearsToAdd + 1 ? yearlyAdd : 0;
      const base = startBalance + addAmount;
      const interest = base * (afterTaxRate / 100);
      const endBalance = base + interest;

      totalDeposits += addAmount;
      totalInterest += interest;
      balance = endBalance;

      rows.push({ year, startBalance, addAmount, interest, endBalance });
    }

    return {
      afterTaxRate,
      totalDeposits,
      totalInterest,
      endingBalance: balance,
      rows
    };
  }, [initialPrincipal, annualRate, taxRate, years, addEveryYear, addYears, annualAdd]);

  useEffect(() => {
    onSummaryChange?.({
      totalDeposits: depositCalc.totalDeposits,
      totalInterest: depositCalc.totalInterest,
      endingBalance: depositCalc.endingBalance,
      afterTaxRate: depositCalc.afterTaxRate
    });
  }, [depositCalc, onSummaryChange]);

  const fieldStyle = { display: "grid", gap: "6px" };
  const helperStyle = { color: "rgba(255,255,255,0.58)", fontSize: "12px", lineHeight: 1.45 };
  const inputStyle = {
    width: "100%",
    border: "1px solid rgba(200,169,110,0.32)",
    borderRadius: "12px",
    padding: "10px 12px",
    background: "rgba(2,6,23,0.72)",
    color: "#F8FAFC"
  };

  return (
    <section style={{
      marginTop: "16px",
      padding: "16px",
      borderRadius: "18px",
      border: "1px solid rgba(200,169,110,0.24)",
      background: "rgba(2,6,23,0.46)",
      color: "#E5E7EB"
    }}>
      <h2 style={{margin: "0 0 6px", color: "#F8FAFC", fontSize: "1.2rem"}}>คำนวณดอกเบี้ยเงินฝากทั่วไป</h2>
      <p style={{margin: "0 0 14px", color: "rgba(255,255,255,0.68)", fontSize: "13px", lineHeight: 1.6}}>
        ใช้คำนวณผลตอบแทนเงินฝากแบบง่าย โดยผู้ใช้กำหนดเงินต้น ดอกเบี้ย ภาษี และระยะเวลาฝากได้เอง
      </p>

      <div className="deposit-input-grid" style={{display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px"}}>
        <label style={fieldStyle}>
          <span>เงินต้นเริ่มต้น</span>
          <input type="number" min="0" placeholder="100000" value={initialPrincipal} onChange={(e) => setInitialPrincipal(e.target.value)} style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          <span>ดอกเบี้ยต่อปี (%)</span>
          <input type="number" min="0" step="0.01" placeholder="0.8" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          <span>ภาษีดอกเบี้ย (%)</span>
          <input type="number" min="0" max="100" step="0.01" placeholder="15" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          <span>ดอกเบี้ยหลังหักภาษี (%)</span>
          <input type="text" readOnly value={`${depositCalc.afterTaxRate.toFixed(2)}%`} style={{...inputStyle, color: "#C8A96E", fontWeight: 900}} />
        </label>
        <label style={fieldStyle}>
          <span>ระยะเวลาฝาก / คิดดอกเบี้ยรวม (ปี)</span>
          <input type="number" min="0" placeholder="5" value={years} onChange={(e) => setYears(e.target.value)} style={inputStyle} />
          <small style={helperStyle}>เช่น ต้องการดูผลลัพธ์เงินฝาก 10 ปี หรือ 15 ปี ให้ใส่จำนวนปีที่ต้องการ</small>
        </label>
        <label style={{...fieldStyle, alignContent: "end"}}>
          <span style={{display: "flex", alignItems: "center", gap: "10px", minHeight: "42px", color: "#E5E7EB", fontWeight: 800}}>
            <input type="checkbox" checked={addEveryYear} onChange={(e) => setAddEveryYear(e.target.checked)} style={{width: "18px", height: "18px", accentColor: "#C8A96E"}} />
            ฝากเพิ่มทุกปี
          </span>
        </label>
      </div>

      {addEveryYear && (
        <div className="deposit-input-grid" style={{display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginTop: "10px"}}>
          <label style={fieldStyle}>
            <span>ฝากเพิ่มเป็นเวลากี่ปี</span>
            <input type="number" min="0" placeholder="3" value={addYears} onChange={(e) => setAddYears(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldStyle}>
            <span>ฝากเพิ่มปีละ</span>
            <input type="number" min="0" placeholder="100000" value={annualAdd} onChange={(e) => setAnnualAdd(e.target.value)} style={inputStyle} />
          </label>
          <div style={{gridColumn: "1 / -1", ...helperStyle}}>
            ใช้กรณีต้องการเติมเงินเพิ่มในช่วงปีแรก ๆ เช่น ฝากเพิ่ม 5 ปี แต่ปล่อยเงินคิดดอกเบี้ยรวม 15 ปี
          </div>
        </div>
      )}

      <div className="deposit-summary-grid" style={{display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginTop: "14px"}}>
        {[
          ["เงินฝากรวมทั้งหมด", money(depositCalc.totalDeposits), "#C8A96E"],
          ["ดอกเบี้ยรวมหลังหักภาษี", money(depositCalc.totalInterest), "#4ADE80"],
          ["ยอดเงินปลายทาง", money(depositCalc.endingBalance), "#4ADE80"],
          ["อัตราดอกเบี้ยสุทธิหลังหักภาษี", `${depositCalc.afterTaxRate.toFixed(2)}%`, "#C8A96E"],
        ].map(([label, value, color]) => (
          <div key={label} style={{
            padding: "12px",
            borderRadius: "14px",
            border: "1px solid rgba(200,169,110,0.22)",
            background: "rgba(15,23,42,0.68)"
          }}>
            <div style={{fontSize: "12px", color: "rgba(255,255,255,0.62)", marginBottom: "5px"}}>{label}</div>
            <div style={{fontSize: "20px", fontWeight: 900, color}}>{value}</div>
          </div>
        ))}
      </div>

      <div className="deposit-table-wrap" style={{marginTop: "14px", overflowX: "auto"}}>
        <table className="deposit-table" style={{width: "100%", minWidth: "640px", borderCollapse: "collapse", fontSize: "13px"}}>
          <thead>
            <tr>
              {["ปีที่", "เงินต้นต้นปี", "ฝากเพิ่ม", "ดอกเบี้ยหลังหักภาษี", "ยอดปลายปี"].map((header) => (
                <th key={header} style={{textAlign: "right", padding: "10px 8px", color: "#C8A96E", borderBottom: "1px solid rgba(200,169,110,0.28)"}}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {depositCalc.rows.length === 0 ? (
              <tr>
                <td colSpan="5" style={{padding: "14px 8px", color: "rgba(255,255,255,0.58)", textAlign: "center"}}>
                  กรอกข้อมูลเพื่อดูรายละเอียดรายปี
                </td>
              </tr>
            ) : depositCalc.rows.map((row) => (
              <tr key={row.year}>
                <td style={{padding: "9px 8px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.08)"}}>{row.year}</td>
                <td style={{padding: "9px 8px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.08)"}}>{money(row.startBalance)}</td>
                <td style={{padding: "9px 8px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.08)", color: row.addAmount > 0 ? "#C8A96E" : "rgba(255,255,255,0.55)"}}>{money(row.addAmount)}</td>
                <td style={{padding: "9px 8px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#4ADE80"}}>{money(row.interest)}</td>
                <td style={{padding: "9px 8px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#F8FAFC", fontWeight: 800}}>{money(row.endBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: "12px",
        padding: "11px 12px",
        borderRadius: "14px",
        border: "1px solid rgba(200,169,110,0.20)",
        color: "rgba(255,255,255,0.66)",
        fontSize: "12px",
        lineHeight: 1.6
      }}>
        ตัวเลขนี้เป็นการคำนวณตัวอย่างแบบง่ายจากดอกเบี้ยรายปี ไม่ใช่ข้อเสนอเงินฝากจากธนาคารใดธนาคารหนึ่ง อัตราดอกเบี้ยจริง เงื่อนไขการจ่ายดอกเบี้ย และภาษี อาจแตกต่างกันตามประเภทบัญชีและเงื่อนไขของแต่ละสถาบันการเงิน
      </div>
    </section>
  );
}


function DisabledFeatureCard({ title, detail }) {
  return (
    <div style={{
      padding: "16px",
      borderRadius: "16px",
      border: "1px solid rgba(200,169,110,0.22)",
      background: "rgba(255,255,255,0.055)",
      color: "#E5E7EB"
    }}>
      <div style={{display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center"}}>
        <div style={{fontWeight: 900, color: "#F8FAFC"}}>{title}</div>
        <span style={{fontSize: "12px", padding: "6px 10px", borderRadius: "999px", background: "rgba(239,68,68,0.18)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.35)"}}>เร็ว ๆ นี้</span>
      </div>
      <div style={{marginTop: "8px", color: "rgba(255,255,255,0.68)", fontSize: "13px", lineHeight: 1.6}}>{detail}</div>
    </div>
  );
}

function FeedbackPoll({ feedback, setFeedback }) {
  const options = [
    { key: "สนใจซื้อ", label: "สนใจซื้อ" },
    { key: "กำลังตัดสินใจ", label: "กำลังตัดสินใจ" },
    { key: "ไม่สนใจ", label: "ไม่สนใจ" },
  ];

  return (
    <div style={{
      marginTop: "16px",
      padding: "16px",
      borderRadius: "16px",
      background: "#FFFBF5",
      border: "1px solid #EAD9B8"
    }}>
      <h3 style={{margin: "0 0 10px", color: "#172033"}}>แบบประเมินความสนใจ</h3>
      <p style={{margin: "0 0 12px", color: "#64748B", fontSize: "13px"}}>
        ข้อมูลนี้ใช้เก็บสถิติแบบไม่ระบุตัวตน เพื่อปรับปรุงการวิเคราะห์ในอนาคต
      </p>
      <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px"}}>
        {options.map((item) => (
          <button
            key={item.key}
            onClick={() => setFeedback(item.key)}
            style={{
              border: feedback === item.key ? "2px solid #C8A96E" : "1px solid #E2E8F0",
              background: feedback === item.key ? "#F9F4EB" : "white",
              color: feedback === item.key ? "#7A6235" : "#334155",
              borderRadius: "12px",
              padding: "10px 8px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "13px"
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {feedback && (
        <div style={{marginTop: "10px", color: "#15803D", fontWeight: 700, fontSize: "13px"}}>
          บันทึกคำตอบตัวอย่างแล้ว: {feedback}
        </div>
      )}
    </div>
  );
}

function CompareUploadBox({ title, file, setFile, text, error, disabled = false }) {
  return (
    <div style={{
      border: "2px dashed #c8a96e",
      borderRadius: "16px",
      padding: "14px",
      background: "#fffbf5",
      minHeight: "240px"
    }}>
      <h3 style={{margin: "0 0 10px", color: "#172033", textAlign: "center"}}>{title}</h3>

      {!file ? (
        <label style={{display: "block", textAlign: "center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1}}>
          <Upload size={30} style={{color: "#8a7a5b", marginBottom: "8px"}} />
          <div style={{fontWeight: 700, color: "#172033", marginBottom: "6px"}}>อัปโหลด PDF / รูปภาพ</div>
          <div style={{fontSize: "12px", color: "#8a7a5b", marginBottom: "10px"}}>เลือกไฟล์ของ {title}</div>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif"
            disabled={disabled}
            onChange={(e) => {
              if (!disabled && e.target.files && e.target.files[0]) {
                setFile(e.target.files[0]);
              }
            }}
            style={{display: "none"}}
          />
          <span className="upload-file-btn" style={{
            display: "inline-block",
            background: disabled ? "linear-gradient(135deg, #D0A74B 0%, #B8872D 100%)" : "linear-gradient(135deg, #DDBB68 0%, #C8A96E 45%, #B8872D 100%)",
            color: "#07111f",
            padding: "10px 16px",
            borderRadius: "12px",
            fontWeight: 800,
            border: "1px solid rgba(126,83,20,0.45)",
            boxShadow: "0 8px 18px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35)",
            opacity: 1
          }}>
            📁 เลือกไฟล์
          </span>
        </label>
      ) : (
        <div>
          <div style={{textAlign: "center"}}>
            <FileText size={28} style={{color: "#c8a96e", marginBottom: "6px"}} />
            <div style={{fontWeight: 700, color: "#172033", wordBreak: "break-word"}}>{file.name}</div>
            <button
              onClick={() => setFile(null)}
              style={{
                marginTop: "10px",
                border: "none",
                background: "#ef4444",
                color: "white",
                padding: "8px 12px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "12px"
              }}
            >
              🗑️ ลบไฟล์
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: "12px",
              backgroundColor: "#fee2e2",
              color: "#7f1d1d",
              padding: "10px",
              borderRadius: "10px",
              fontSize: "12px"
            }}>
              {error}
            </div>
          )}

          {text && !error && (
            <div style={{
              marginTop: "12px",
              backgroundColor: "#f9f4eb",
              padding: "10px",
              borderRadius: "10px",
              maxHeight: "160px",
              overflowY: "auto",
              fontSize: "12px",
              lineHeight: "1.5",
              color: "#495065",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }}>
              {text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Input({ label, value, setValue, step = "1", placeholder = "กรอกข้อมูล", min }) {
  return (
    <label>
      <span>{label}</span>
      <input type="number" step={step}
        min={min}
        placeholder={placeholder} value={value === 0 ? "" : value} onChange={(e) => setValue(e.target.value === "" ? 0 : Number(e.target.value))} />
    </label>
  );
}

function Metric({ title, value }) {
  return (
    <div className="metric">
      <span>{title}</span>
      <b>{value}</b>
    </div>
  );
}

export default App;
