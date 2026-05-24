import ast
import re
import traceback
from typing import Dict, Optional


def extract_final_python_code(response_text):
    allowed_import_paths = ["agents.generator", "backend.agents.generator", "promoai.model_generation.generator"]
    allowed_import_class = "ModelGenerator"
    any_import_pattern = r"^\s*(from\s+\S+\s+import\s+\S+|import\s+\S+)"

    # Try multiple patterns to find Python code blocks
    python_snippet = None
    
    # Pattern 1: ```python ... ```
    matches = re.findall(r"```python(.*?)```", response_text, re.DOTALL)
    if matches:
        python_snippet = matches[-1].strip()
    
    # Pattern 2: ```Python ... ``` (case-insensitive)
    if not python_snippet:
        matches = re.findall(r"```[Pp]ython\s*(.*?)```", response_text, re.DOTALL)
        if matches:
            python_snippet = matches[-1].strip()
    
    # Pattern 3: ``` ... ``` (generic code blocks that contain 'final_model')
    if not python_snippet:
        matches = re.findall(r"```(.*?)```", response_text, re.DOTALL)
        for m in reversed(matches):
            if "final_model" in m:
                python_snippet = m.strip()
                break
    
    # Pattern 4: Look for code starting with 'from agents.generator' without code fences
    if not python_snippet:
        lines = response_text.split('\n')
        code_lines = []
        in_code = False
        for line in lines:
            if 'from agents.generator import' in line or 'ModelGenerator' in line:
                in_code = True
            if in_code:
                code_lines.append(line)
            if in_code and 'final_model' in line and '=' in line:
                break
        if code_lines and any('final_model' in l for l in code_lines):
            python_snippet = '\n'.join(code_lines).strip()

    if not python_snippet:
        print(f"[LangGraph] Failed to extract code. Response preview: {response_text[:500]}")
        raise Exception("No Python code snippet found!")

    # Validate imports
    lines = python_snippet.split("\n")
    for line in lines:
        if re.match(any_import_pattern, line):
            is_allowed = False
            for path in allowed_import_paths:
                allowed_import_pattern_check = (
                    r"^\s*(from\s+"
                    + re.escape(path)
                    + r"\s+import\s+"
                    + re.escape(allowed_import_class)
                    + r"|import\s+"
                    + re.escape(path)
                    + r"\."
                    + re.escape(allowed_import_class)
                    + r")\s*$"
                )
                if re.match(allowed_import_pattern_check, line):
                    is_allowed = True
                    break
            if not is_allowed:
                raise Exception(
                    "Python snippet does not meet the import statement requirements! "
                    "Only the following import statement is allowed: "
                    + f"from agents.generator import {allowed_import_class}"
                )
    return python_snippet


def execute_code_and_get_variable(
    code, variable_name, namespace: Optional[Dict] = None
):
    try:
        local_vars = (namespace or {}).copy()
        # In order for the code to execute correctly even if it imports from agents.generator,
        # we can inject a mock module or prepend the path or add it to local_vars.
        # Let's ensure ModelGenerator is in local_vars and globals.
        from agents.generator import ModelGenerator
        local_vars["ModelGenerator"] = ModelGenerator
        
        exec(code, globals(), local_vars)
        try:
            value = local_vars[variable_name]
        except KeyError:
            raise ValueError(f"Variable '{variable_name}' not found!")
        return value
    except Exception:
        exc_type, exc_value, exc_traceback = traceback.sys.exc_info()
        error_msg = traceback.format_exception_only(exc_type, exc_value)[-1].strip()

        line_number, error_line = None, "Error line not directly available."
        filename = "<string>"

        for frame in traceback.extract_tb(exc_traceback):
            if frame.filename == filename:
                line_number = frame.lineno
                try:
                    error_line = code.split("\n")[line_number - 1]
                except IndexError:
                    error_line = "Line number out of range."
                break

        if line_number:
            error_details = f'Error occurred at line {line_number}: "{error_line}" with message: {error_msg}'
        else:
            error_details = (
                f"Error occurred with message: {error_msg}. \n The error occurred with trying to execute "
                f"the following extracted code: {code}. "
            )

        raise Exception(error_details)


def extract_resources_from_code(code):
    """
    Extract gen.activity calls with their pool and lane.

    Returns:
        dict: activity_name -> (pool, lane, annotations, systems, variables)
    """
    tree = ast.parse(code)
    resources = {}
    variables = {}

    class ActivityVisitor(ast.NodeVisitor):
        def visit_Assign(self, node):
            # var = "value" or var = None
            if len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
                var_name = node.targets[0].id
                variables[var_name] = self.resolve_value(node.value)

            if isinstance(node.value, ast.Call):
                self.process_call(node.value)

            self.generic_visit(node)

        def visit_Expr(self, node):
            # Standalone expressions like: gen.activity("A", ...)
            if isinstance(node.value, ast.Call):
                self.process_call(node.value)
            self.generic_visit(node)

        def process_call(self, call):
            func = call.func
            if isinstance(func, ast.Attribute) and func.attr == "activity":
                # Activity name
                activity_name = None
                if len(call.args) >= 1:
                    activity_name = self.resolve_value(call.args[0])
                if activity_name is None:
                    return
                # Positional args (if any)
                pool_val = None
                lane_val = None
                annotations_val = ""
                systems_val = []
                variables_val = []
                
                if len(call.args) >= 2:
                    pool_val = self.resolve_value(call.args[1])
                if len(call.args) >= 3:
                    lane_val = self.resolve_value(call.args[2])
                if len(call.args) >= 4:
                    annotations_val = self.resolve_value(call.args[3]) or ""
                if len(call.args) >= 5:
                    systems_val = self.resolve_value(call.args[4]) or []
                if len(call.args) >= 6:
                    variables_val = self.resolve_value(call.args[5]) or []

                # Override with keyword args if these are provided
                for kw in call.keywords:
                    if kw.arg == "pool":
                        pool_val = self.resolve_value(kw.value)
                    elif kw.arg == "lane":
                        lane_val = self.resolve_value(kw.value)
                    elif kw.arg == "annotations":
                        annotations_val = self.resolve_value(kw.value) or ""
                    elif kw.arg == "systems":
                        systems_val = self.resolve_value(kw.value) or []
                    elif kw.arg == "variables":
                        variables_val = self.resolve_value(kw.value) or []

                resources[activity_name] = (pool_val, lane_val, annotations_val, systems_val, variables_val)

        def resolve_value(self, node):
            if isinstance(node, ast.Constant):
                return node.value
            elif isinstance(node, ast.Name):
                return variables.get(node.id, None)
            elif isinstance(node, ast.List):
                return [self.resolve_value(el) for el in node.elts]
            return None

    ActivityVisitor().visit(tree)
    return resources
