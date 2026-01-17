import { Customer } from './customerService';
import { ScanResult, PeriodCheckResult } from './reportService';

export interface Deadline {
  month: number;           // 1-12
  monthName: string;
  gelirDeadline: Date;     // Gelir Vergisi mükellefleri son tarih
  kurumlarDeadline: Date;  // Kurumlar Vergisi (diğer) mükellefleri son tarih
}

export interface UpcomingDeadline {
  customer: Customer;
  period: string;          // YYYYMM
  periodDisplay: string;   // "Ocak 2025"
  deadline: Date;
  daysRemaining: number;
  isOverdue: boolean;
  isCompleted: boolean;
}

export interface CompletionStatus {
  customer: Customer;
  completedPeriods: string[];
  incompletePeriods: string[];
  overduePeriods: string[];
  nextDeadline?: Date;
  daysToNextDeadline?: number;
}

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

// Aylık yükleme son tarihleri (dönemin bitiminden sonraki ay)
// Örn: Ocak dönemi için son tarih: Gelir vergisi -> 10 Mayıs, Kurumlar -> 14 Mayıs
const MONTHLY_DEADLINES: { [key: number]: { gelir: { month: number; day: number }; kurumlar: { month: number; day: number } } } = {
  1:  { gelir: { month: 5, day: 10 },  kurumlar: { month: 5, day: 14 } },   // Ocak -> Mayıs
  2:  { gelir: { month: 6, day: 10 },  kurumlar: { month: 6, day: 14 } },   // Şubat -> Haziran
  3:  { gelir: { month: 7, day: 10 },  kurumlar: { month: 7, day: 14 } },   // Mart -> Temmuz
  4:  { gelir: { month: 8, day: 10 },  kurumlar: { month: 8, day: 14 } },   // Nisan -> Ağustos
  5:  { gelir: { month: 9, day: 10 },  kurumlar: { month: 9, day: 14 } },   // Mayıs -> Eylül
  6:  { gelir: { month: 10, day: 10 }, kurumlar: { month: 10, day: 14 } },  // Haziran -> Ekim
  7:  { gelir: { month: 11, day: 10 }, kurumlar: { month: 11, day: 14 } },  // Temmuz -> Kasım
  8:  { gelir: { month: 12, day: 10 }, kurumlar: { month: 12, day: 14 } },  // Ağustos -> Aralık
  9:  { gelir: { month: 1, day: 10 },  kurumlar: { month: 1, day: 14 } },   // Eylül -> Ocak (sonraki yıl)
  10: { gelir: { month: 2, day: 10 },  kurumlar: { month: 2, day: 14 } },   // Ekim -> Şubat
  11: { gelir: { month: 3, day: 10 },  kurumlar: { month: 3, day: 14 } },   // Kasım -> Mart
  12: { gelir: { month: 4, day: 10 },  kurumlar: { month: 4, day: 14 } }    // Aralık -> Nisan (sonraki yıl)
};

// Geçici vergi dönemleri (3 aylık)
// Ocak-Mart -> 10 Haziran / 14 Haziran
// Nisan-Haziran -> 10 Eylül / 14 Eylül
// Temmuz-Eylül -> 10 Aralık / 14 Aralık
// Ekim-Aralık -> 10 Nisan / 14 Mayıs (sonraki yıl)
const QUARTERLY_DEADLINES: { [key: string]: { gelir: { month: number; day: number }; kurumlar: { month: number; day: number } } } = {
  'Q1': { gelir: { month: 6, day: 10 },  kurumlar: { month: 6, day: 14 } },   // Ocak-Mart
  'Q2': { gelir: { month: 9, day: 10 },  kurumlar: { month: 9, day: 14 } },   // Nisan-Haziran
  'Q3': { gelir: { month: 12, day: 10 }, kurumlar: { month: 12, day: 14 } },  // Temmuz-Eylül
  'Q4': { gelir: { month: 4, day: 10 },  kurumlar: { month: 5, day: 14 } }    // Ekim-Aralık (sonraki yıl)
};

export class DeadlineService {
  
  getDeadlineForPeriod(period: string, taxType: 'gelir' | 'kurumlar', isQuarterly: boolean): Date {
    const year = parseInt(period.slice(0, 4));
    const month = parseInt(period.slice(4, 6));

    if (isQuarterly) {
      return this.getQuarterlyDeadline(year, month, taxType);
    } else {
      return this.getMonthlyDeadline(year, month, taxType);
    }
  }

  private getMonthlyDeadline(periodYear: number, periodMonth: number, taxType: 'gelir' | 'kurumlar'): Date {
    const deadlineInfo = MONTHLY_DEADLINES[periodMonth];
    const deadline = taxType === 'gelir' ? deadlineInfo.gelir : deadlineInfo.kurumlar;
    
    // Calculate the deadline year
    let deadlineYear = periodYear;
    if (deadline.month < periodMonth) {
      deadlineYear++; // Deadline is in the next year
    }

    return new Date(deadlineYear, deadline.month - 1, deadline.day);
  }

  private getQuarterlyDeadline(periodYear: number, periodMonth: number, taxType: 'gelir' | 'kurumlar'): Date {
    // Determine quarter
    let quarter: string;
    if (periodMonth >= 1 && periodMonth <= 3) {
      quarter = 'Q1';
    } else if (periodMonth >= 4 && periodMonth <= 6) {
      quarter = 'Q2';
    } else if (periodMonth >= 7 && periodMonth <= 9) {
      quarter = 'Q3';
    } else {
      quarter = 'Q4';
    }

    const deadlineInfo = QUARTERLY_DEADLINES[quarter];
    const deadline = taxType === 'gelir' ? deadlineInfo.gelir : deadlineInfo.kurumlar;

    // Calculate the deadline year
    let deadlineYear = periodYear;
    if (quarter === 'Q4' || (quarter === 'Q3' && deadline.month < 10)) {
      deadlineYear++; // Deadline is in the next year
    }

    return new Date(deadlineYear, deadline.month - 1, deadline.day);
  }

  getUpcomingDeadlines(customers: Customer[]): UpcomingDeadline[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const deadlines: UpcomingDeadline[] = [];

    for (const customer of customers) {
      if (!customer.isActive) continue;

      // Check deadlines for last 12 months
      for (let i = 0; i < 12; i++) {
        let month = currentMonth - i;
        let year = currentYear;
        
        if (month <= 0) {
          month += 12;
          year--;
        }

        const period = `${year}${month.toString().padStart(2, '0')}`;
        const isQuarterly = customer.uploadPeriod === 'quarterly';

        // For quarterly, only check quarter-end months
        if (isQuarterly && ![3, 6, 9, 12].includes(month)) {
          continue;
        }

        const deadline = this.getDeadlineForPeriod(period, customer.taxType, isQuarterly);
        const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysRemaining < 0;

        // Only include if deadline is within next 90 days or overdue within last 30 days
        if (daysRemaining <= 90 && daysRemaining >= -30) {
          deadlines.push({
            customer,
            period,
            periodDisplay: `${MONTH_NAMES_TR[month - 1]} ${year}`,
            deadline,
            daysRemaining,
            isOverdue,
            isCompleted: false // Will be updated with scan results
          });
        }
      }
    }

    // Sort by deadline
    deadlines.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

    return deadlines;
  }

  getCompletionStatus(scanResult: ScanResult, customers: Customer[]): CompletionStatus[] {
    const now = new Date();
    const statusList: CompletionStatus[] = [];

    for (const customer of customers) {
      if (!customer.isActive) continue;

      const taxNo = customer.taxNo || customer.tcNo;
      const company = scanResult.companies.find(c => c.taxNo === taxNo);

      const status: CompletionStatus = {
        customer,
        completedPeriods: [],
        incompletePeriods: [],
        overduePeriods: []
      };

      if (company) {
        for (const period of company.periods) {
          const isQuarterly = customer.uploadPeriod === 'quarterly';
          const deadline = this.getDeadlineForPeriod(period.period, customer.taxType, isQuarterly);
          const isOverdue = deadline < now;

          if (period.isComplete) {
            status.completedPeriods.push(period.periodDisplay);
          } else if (isOverdue) {
            status.overduePeriods.push(period.periodDisplay);
          } else {
            status.incompletePeriods.push(period.periodDisplay);
          }
        }
      }

      // Find next deadline
      const upcomingDeadlines = this.getUpcomingDeadlines([customer])
        .filter(d => !d.isOverdue);
      
      if (upcomingDeadlines.length > 0) {
        status.nextDeadline = upcomingDeadlines[0].deadline;
        status.daysToNextDeadline = upcomingDeadlines[0].daysRemaining;
      }

      statusList.push(status);
    }

    return statusList;
  }

  formatDeadlineInfo(deadline: UpcomingDeadline): string {
    if (deadline.isOverdue) {
      return `${Math.abs(deadline.daysRemaining)} gün gecikmiş`;
    } else if (deadline.daysRemaining === 0) {
      return 'Bugün son gün!';
    } else if (deadline.daysRemaining === 1) {
      return 'Yarın son gün!';
    } else if (deadline.daysRemaining <= 7) {
      return `${deadline.daysRemaining} gün kaldı`;
    } else {
      return `${deadline.daysRemaining} gün kaldı (${deadline.deadline.toLocaleDateString('tr-TR')})`;
    }
  }

  getExpectedPeriods(year: number, month: number, isQuarterly: boolean): string[] {
    const periods: string[] = [];
    
    if (isQuarterly) {
      // For quarterly, only quarter-end months matter
      const quarterEndMonths = [3, 6, 9, 12];
      for (const qMonth of quarterEndMonths) {
        if (qMonth <= month) {
          periods.push(`${year}${qMonth.toString().padStart(2, '0')}`);
        }
      }
    } else {
      // For monthly, all months up to current
      for (let m = 1; m <= month; m++) {
        periods.push(`${year}${m.toString().padStart(2, '0')}`);
      }
    }

    return periods;
  }

  getSummaryStats(completionStatus: CompletionStatus[]): {
    totalCustomers: number;
    totalCompleted: number;
    totalIncomplete: number;
    totalOverdue: number;
    overdueCustomers: string[];
    upcomingDeadlineCustomers: string[];
  } {
    let totalCompleted = 0;
    let totalIncomplete = 0;
    let totalOverdue = 0;
    const overdueCustomers: string[] = [];
    const upcomingDeadlineCustomers: string[] = [];

    for (const status of completionStatus) {
      totalCompleted += status.completedPeriods.length;
      totalIncomplete += status.incompletePeriods.length;
      totalOverdue += status.overduePeriods.length;

      if (status.overduePeriods.length > 0) {
        overdueCustomers.push(status.customer.companyName);
      }

      if (status.daysToNextDeadline !== undefined && status.daysToNextDeadline <= 7) {
        upcomingDeadlineCustomers.push(status.customer.companyName);
      }
    }

    return {
      totalCustomers: completionStatus.length,
      totalCompleted,
      totalIncomplete,
      totalOverdue,
      overdueCustomers,
      upcomingDeadlineCustomers
    };
  }
}
