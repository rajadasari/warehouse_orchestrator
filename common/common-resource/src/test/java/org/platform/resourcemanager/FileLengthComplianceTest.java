package org.platform.resourcemanager;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class FileLengthComplianceTest {

    private static final int MAX_ALLOWED_LINES = 250;

    @Test
    @DisplayName("Verify that NO Java source or test file exceeds 250 lines")
    void verifyNoJavaFileExceedsLineLimit() throws IOException {
        Path rootSrc = Paths.get("src");
        List<String> violations = new ArrayList<>();
        List<String> auditedFiles = new ArrayList<>();

        try (Stream<Path> stream = Files.walk(rootSrc)) {
            stream.filter(Files::isRegularFile)
                  .filter(p -> p.toString().endsWith(".java"))
                  .forEach(path -> {
                      try {
                          long lineCount = Files.lines(path).count();
                          auditedFiles.add(path.getFileName() + " (" + lineCount + " lines)");
                          if (lineCount > MAX_ALLOWED_LINES) {
                              violations.add(String.format("%s has %d lines (limit: %d)",
                                      path, lineCount, MAX_ALLOWED_LINES));
                          }
                      } catch (IOException e) {
                          throw new RuntimeException("Failed reading file: " + path, e);
                      }
                  });
        }

        assertThat(auditedFiles).isNotEmpty();
        assertThat(violations)
                .withFailMessage("The following files exceed the %d-line limit:\n%s",
                        MAX_ALLOWED_LINES, String.join("\n", violations))
                .isEmpty();
    }
}
