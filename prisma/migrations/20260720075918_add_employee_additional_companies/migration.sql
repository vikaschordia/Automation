-- CreateTable
CREATE TABLE "_EmployeeAdditionalCompanies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_EmployeeAdditionalCompanies_A_fkey" FOREIGN KEY ("A") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_EmployeeAdditionalCompanies_B_fkey" FOREIGN KEY ("B") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_EmployeeAdditionalCompanies_AB_unique" ON "_EmployeeAdditionalCompanies"("A", "B");

-- CreateIndex
CREATE INDEX "_EmployeeAdditionalCompanies_B_index" ON "_EmployeeAdditionalCompanies"("B");
