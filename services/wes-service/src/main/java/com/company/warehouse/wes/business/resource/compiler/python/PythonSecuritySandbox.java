package com.company.warehouse.wes.business.resource.compiler.python;

import java.util.regex.Pattern;

/**
 * IEC 62443 Security Sandbox Validator for Dynamic Python Scripts.
 * Prevents OS execution, filesystem manipulation, and reflection exploits on the industrial shop floor.
 */
public final class PythonSecuritySandbox {

    private static final Pattern FORBIDDEN_TOKENS = Pattern.compile(
            "\\b("
                    + "import\\s+os|import\\s+sys|import\\s+subprocess|import\\s+shutil|"
                    + "from\\s+os\\b|from\\s+sys\\b|from\\s+subprocess\\b|"
                    + "__import__|eval\\s*\\(|execfile\\s*\\(|compile\\s*\\(|"
                    + "open\\s*\\(|file\\s*\\(|"
                    + "System\\.exit|Runtime\\.getRuntime|ProcessBuilder|ClassLoader|reflect|"
                    + "Thread\\.sleep"
                    + ")\\b"
    );

    private PythonSecuritySandbox() {
    }

    /**
     * Inspects Python code against IEC 62443 security constraints.
     *
     * @param script The Python script to validate
     * @throws SecurityException If forbidden tokens or dangerous APIs are detected
     */
    public static void validate(String script) {
        if (script == null || script.trim().isEmpty()) {
            return;
        }

        if (FORBIDDEN_TOKENS.matcher(script).find()) {
            throw new SecurityException(
                    "IEC 62443 Security Violation: Python script contains forbidden system calls, OS operations, or dynamic imports."
            );
        }
    }
}
